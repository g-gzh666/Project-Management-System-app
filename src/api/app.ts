import http from './http';

export interface ApiResp<T> {
  code: number;
  msg: string;
  data: T;
}

export interface LoginResp {
  access_token: string;
  Clientid: string;
  expire_in: number;
  id: number;
  nick_name?: string;
  avatar?: string;
  phone?: string;
}

export const loginApi = (payload: { account: string; password: string; userName: string }) =>
  http
    .post<ApiResp<LoginResp>>('/user/user/appUser/login', payload, {
      headers: {
        clientid: import.meta.env.VITE_APP_CLIENT_ID || 'web_app'
      },
      skipAuth: true
    } as any)
    .then((r) => r.data);

export const registerApi = (payload: { account: string; password: string; userName: string; phone?: string; email?: string }) =>
  http
    .post<ApiResp<any>>('/user/user/appUser/register', payload, {
      headers: {
        clientid: import.meta.env.VITE_APP_CLIENT_ID || 'web_app'
      },
      skipAuth: true
    } as any)
    .then((r) => r.data);

export const getUserByAccountApi = (account: string) =>
  http.get<ApiResp<any>>('/user/user/appUser/getUserByAccount', { params: { account } }).then((r) => r.data);

export const updateAppUserApi = (payload: Record<string, any>) =>
  http.put<ApiResp<any>>('/user/user/appUser', payload).then((r) => r.data);

export const listJobApi = (params: Record<string, any>) =>
  http.get<{ rows: any[]; total: number }>('/user/jianli/job/list', { params }).then((r) => r.data);

export const uploadAvatarApi = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return http.post<ApiResp<{ url: string; fileName: string; ossId: string }>>('/user/user/appUser/uploadAvatar', form).then((r) => r.data);
};

export const uploadResumePdfApi = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return http.post<ApiResp<{ url: string; fileName: string; ossId: string }>>('/user/jianli/resume/upload', form).then((r) => r.data);
};

export const matchResumeApi = (params: Record<string, any>) =>
  http.get<ApiResp<string>>('/user/jianli/resume/match', { params }).then((r) => r.data);

export const matchResumeStreamApi = async (
  params: { resumeId: string; jobId: string },
  onChunk: (chunk: string) => void
) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const token = localStorage.getItem('app_token') || '';
  const clientid = localStorage.getItem('app_clientid') || import.meta.env.VITE_APP_CLIENT_ID || 'web_app';
  const search = new URLSearchParams({
    resumeId: String(params.resumeId),
    jobId: String(params.jobId)
  }).toString();
  const url = `${baseUrl}/user/jianli/resume/match?${search}`;

  const emitParsedChunk = (raw: string) => {
    if (!raw) return;
    const lines = raw.split('\n');
    let sseHit = false;
    lines.forEach((line) => {
      if (line.startsWith('data:')) {
        sseHit = true;
        onChunk(`${line.slice(5).trimStart()}\n`);
      }
    });
    if (!sseHit) onChunk(raw);
  };

  // 与简历解析保持一致：优先 fetch stream，失败再回退 XHR onprogress
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream, text/plain, application/json',
        Authorization: token,
        clientid
      }
    });
    if (!resp.ok) throw new Error(`匹配请求失败: ${resp.status}`);
    if (!resp.body) return;
    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      emitParsedChunk(decoder.decode(value, { stream: true }));
    }
    return;
  } catch {
    // fallback
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let cursor = 0;
    xhr.open('GET', url, true);
    xhr.overrideMimeType('text/plain; charset=utf-8');
    xhr.setRequestHeader('Accept', 'text/event-stream, text/plain, application/json');
    if (token) xhr.setRequestHeader('Authorization', token);
    xhr.setRequestHeader('clientid', clientid);
    xhr.onprogress = () => {
      const next = xhr.responseText.slice(cursor);
      cursor = xhr.responseText.length;
      emitParsedChunk(next);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const tail = xhr.responseText.slice(cursor);
        emitParsedChunk(tail);
        resolve();
      } else {
        reject(new Error(`匹配请求失败: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('匹配流式连接失败'));
    xhr.ontimeout = () => reject(new Error('匹配流式请求超时'));
    xhr.timeout = 120000;
    xhr.send();
  });
};

export const parseResumeStreamApi = async (file: File, onChunk: (chunk: string) => void, resumeId?: number) => {
  const form = new FormData();
  form.append('file', file);
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const token = localStorage.getItem('app_token') || '';
  const clientid = localStorage.getItem('app_clientid') || import.meta.env.VITE_APP_CLIENT_ID || 'web_app';
  const url = `${baseUrl}/user/jianli/resume/parse${resumeId ? `?resumeId=${Number(resumeId)}` : ''}`;

  const emitParsedChunk = (raw: string) => {
    if (!raw) return;
    const lines = raw.split('\n');
    let sseHit = false;
    lines.forEach((line) => {
      if (line.startsWith('data:')) {
        sseHit = true;
        onChunk(`${line.slice(5).trimStart()}\n`);
      }
    });
    if (!sseHit) onChunk(raw);
  };

  // 优先 fetch stream，失败后回退到 XHR onprogress，保证 Flux<String> 可实时展示
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream, text/plain, application/json',
        Authorization: token,
        clientid
      },
      body: form
    });
    if (!resp.ok) throw new Error(`解析请求失败: ${resp.status}`);
    if (!resp.body) return;
    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      emitParsedChunk(decoder.decode(value, { stream: true }));
    }
    return;
  } catch {
    // fallback
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let cursor = 0;
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Accept', 'text/event-stream, text/plain, application/json');
    if (token) xhr.setRequestHeader('Authorization', token);
    xhr.setRequestHeader('clientid', clientid);
    xhr.onprogress = () => {
      const next = xhr.responseText.slice(cursor);
      cursor = xhr.responseText.length;
      emitParsedChunk(next);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const tail = xhr.responseText.slice(cursor);
        emitParsedChunk(tail);
        resolve();
      } else {
        reject(new Error(`解析请求失败: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('流式连接失败'));
    xhr.send(form);
  });
};

export const addResumeApi = (payload: Record<string, any>) =>
  http.post<ApiResp<any>>('/user/jianli/resume', payload).then((r) => r.data);

export const listResumeApi = (params: Record<string, any>) =>
  http.get<{ rows: any[]; total: number }>('/user/jianli/resume/list', { params }).then((r) => r.data);

export const getResumeDetailApi = (id: number) =>
  http.get<ApiResp<any>>(`/user/jianli/resume/${id}`).then((r) => r.data);

export const listResumeInfoApi = (params: Record<string, any>) =>
  http.get<{ rows: any[]; total: number }>('/user/jianli/resumeInfo/list', { params }).then((r) => r.data);

export const listResumeJobMatchApi = (params: Record<string, any>) =>
  http.get<{ rows: any[]; total: number }>('/user/jianli/resumeJobMatch/list', { params }).then((r) => r.data);

export const getResumeJobMatchInfoApi = (id: string) =>
  http.get<ApiResp<any>>(`/user/jianli/resumeJobMatch/${id}`).then((r) => r.data);

export const getResumeJobMatchByPairApi = (params: { resumeId: string; jobId: string }) =>
  http.get<ApiResp<any>>('/user/jianli/resumeJobMatch/pipei', { params }).then((r) => r.data);
