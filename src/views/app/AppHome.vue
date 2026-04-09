<template>
  <div class="app-shell boss-shell">
    <header class="boss-header">
      <div>
        <h2>简历智能匹配中心</h2>
        <span>先看岗位，再选择附件简历直接匹配</span>
      </div>
      <el-space>
        <div class="profile-chip" @click="router.push('/app/profile')">
          <el-avatar :src="auth.user.avatar || ''" :size="34">{{ (auth.user.nickName || auth.user.account || 'U').slice(0, 1) }}</el-avatar>
          <div class="profile-text">
            <b>{{ auth.user.nickName || auth.user.account || '用户' }}</b>
            <span>进入个人中心</span>
          </div>
        </div>
        <el-button @click="refreshAll">刷新</el-button>
        <el-button plain @click="logout">退出登录</el-button>
      </el-space>
    </header>

    <div class="view-switch glass-card">
      <div class="switch-item" :class="{ active: !jobDetail }">岗位广场</div>
      <div class="switch-item" :class="{ active: !!jobDetail }">岗位详情与匹配</div>
    </div>

    <template v-if="!jobDetail">
      <section class="boss-search">
        <el-input v-model="jobQuery.jobName" placeholder="搜索职位，如 Java 开发工程师" clearable class="search-input" />
        <el-input v-model="searchKeyword" placeholder="技能关键词，如 spring、vue" clearable class="search-input" />
        <el-button type="primary" class="search-btn" @click="loadJobs">搜索岗位</el-button>
      </section>

      <section class="job-list-page glass-card">
        <div class="feed-title">精选岗位列表（{{ filteredJobs.length }}）</div>
        <div class="job-grid">
          <div v-for="job in filteredJobs" :key="job.id" class="job-card large" @click="openJobDetailPage(job)">
            <div class="job-top">
              <h3>{{ job.jobName || '未命名岗位' }}</h3>
              <span class="salary">{{ job.jobSalary || '薪资面议' }}</span>
            </div>
            <div class="job-meta">
              <span>{{ job.jobAddress || '地点不限' }}</span>
              <span>{{ job.jobType || '全职' }}</span>
              <span>岗位编号: {{ job.jobNo || '-' }}</span>
            </div>
            <p class="job-desc">{{ job.jobRequirement || '暂无岗位描述' }}</p>
            <div class="job-tags">
              <el-tag v-for="tag in parseTextKeywords(job.jobKeywords).slice(0, 6)" :key="`${job.id}-${tag}`" effect="plain" round>{{ tag }}</el-tag>
            </div>
            <div class="job-action">
              <el-button type="primary" round>查看详情并开始评分</el-button>
            </div>
          </div>
        </div>
        <el-empty v-if="filteredJobs.length === 0" description="暂无岗位数据" />
      </section>
    </template>

    <section v-else class="job-detail-page glass-card">
      <div class="detail-back">
        <el-button type="primary" plain round @click="backToJobList">← 返回岗位广场</el-button>
        <el-tag effect="dark" type="info">当前岗位ID: {{ jobDetail?.id }}</el-tag>
      </div>

      <main class="job-detail">
        <div class="detail-title">
          <div>
            <h3>{{ jobDetail.jobName }}</h3>
            <p>{{ jobDetail.jobAddress || '地点不限' }} · {{ jobDetail.jobType || '全职' }}</p>
          </div>
          <el-tag type="danger" size="large">{{ jobDetail.jobSalary || '薪资面议' }}</el-tag>
        </div>

        <div class="detail-block">
          <h4>岗位关键词</h4>
          <el-space wrap>
            <el-tag v-for="tag in parseTextKeywords(jobDetail.jobKeywords)" :key="tag" round>{{ tag }}</el-tag>
          </el-space>
        </div>

        <div class="detail-block">
          <h4>岗位职责与要求</h4>
          <p class="job-requirement">{{ jobDetail.jobRequirement || '暂无描述' }}</p>
        </div>

        <div class="detail-block resume-select-block">
          <h4>选择附件简历并匹配</h4>
          <div class="flow-tip">
            <el-tag round type="info">1. 仅选择已有附件简历</el-tag>
            <el-tag round type="success">2. 直接匹配岗位</el-tag>
          </div>
          <div class="resume-pane">
            <div class="resume-pane-title">附件简历（来自个人中心上传）</div>
            <el-select v-model="selectedResumeId" placeholder="请选择简历" class="w-full" @change="onResumeChanged">
              <el-option
                v-for="item in resumeList"
                :key="String(item.id)"
                :label="`${item.originalName || '未命名'}（${parseStatusText(item.parseStatus)}）`"
                :value="String(item.id)"
              />
            </el-select>
            <div class="tip mt-8">没有简历？请去右上角“个人中心”上传附件简历。</div>
            <el-space class="mt-12">
              <el-button type="primary" plain round :loading="usingResume" @click="useExistingResume">使用该简历</el-button>
              <el-button type="primary" round :loading="matchingResume" @click="matchSelectedResume">开始匹配</el-button>
            </el-space>
          </div>
        </div>

        <div v-if="parseResult" class="detail-block">
          <h4>解析后文档预览</h4>
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="姓名">{{ parseResult.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="电话">{{ parseResult.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ parseResult.email || '-' }}</el-descriptions-item>
            <el-descriptions-item label="地址">{{ parseResult.address || '-' }}</el-descriptions-item>
            <el-descriptions-item label="求职意向">{{ parseResult.jobIntention || '-' }}</el-descriptions-item>
            <el-descriptions-item label="期望薪资">{{ parseResult.expectedSalary || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工作年限">{{ parseResult.workYears || '-' }}</el-descriptions-item>
            <el-descriptions-item label="学历">{{ parseResult.education || '-' }}</el-descriptions-item>
            <el-descriptions-item label="项目经历" :span="2">{{ parseResult.projectExperience || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div class="mt-8">
            <el-tag v-for="tag in normalizedSkillTags" :key="tag" class="mr-6" type="success" effect="plain" round>{{ tag }}</el-tag>
          </div>
        </div>

        <div v-if="displayMatchResult" class="detail-block">
          <h4>匹配接口结果（/resume/match）</h4>
          <el-row :gutter="14" class="mb-8">
            <el-col :span="8">
              <div class="score-dashboard">
                <el-progress type="dashboard" :percentage="displayMatchScore" :stroke-width="10" />
              </div>
            </el-col>
            <el-col :span="16">
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="匹配度">{{ displayMatchScore }}%</el-descriptions-item>
                <el-descriptions-item label="评分原因">{{ displayWhyText || '暂无评分原因' }}</el-descriptions-item>
              </el-descriptions>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-statistic title="综合匹配度" :value="displayMatchScore" />
            </el-col>
            <el-col :span="12">
              <el-space>
                <el-tag type="success">技能 {{ displaySkillScore }}%</el-tag>
                <el-tag type="warning">经验 {{ displayExpScore }}%</el-tag>
                <el-tag type="primary">学历 {{ displayEduScore }}%</el-tag>
              </el-space>
            </el-col>
          </el-row>
          <p class="analysis-text mt-8">{{ displayAiAnalysis || '暂无AI分析' }}</p>
          <el-card shadow="never" class="inner-card mt-12">
            <template #header>匹配接口原始 JSON</template>
            <pre class="match-json">{{ matchResultRaw || '-' }}</pre>
          </el-card>
        </div>


        <div class="detail-block">
          <h4>该岗位匹配结果列表</h4>
          <el-input v-model="matchKeyword" placeholder="筛选 AI 分析关键词" clearable class="mb-8" />
          <el-table :data="sortedFilteredMatchRows" height="240" @row-click="openMatchDetail">
            <el-table-column prop="matchScore" label="综合分" width="100" />
            <el-table-column prop="skillMatchRate" label="技能" width="80" />
            <el-table-column prop="experienceMatchRate" label="经验" width="80" />
            <el-table-column prop="educationMatchRate" label="学历" width="80" />
            <el-table-column prop="aiAnalysis" label="AI分析" min-width="180" show-overflow-tooltip />
          </el-table>
        </div>
      </main>
    </section>

    <el-drawer v-model="matchStreamVisible" title="岗位匹配过程（流式输出）" direction="rtl" size="42%">
      <div class="stream-meta">
        <el-tag :type="matchStreamRunning ? 'warning' : 'success'">{{ matchStreamRunning ? '匹配中' : '匹配完成' }}</el-tag>
      </div>
      <div ref="matchStreamBoxRef" class="stream-output pretty-stream">
        <template v-if="matchStreamLines.length">
          <div v-for="(line, idx) in matchStreamLines" :key="`${idx}-${line.text}`" class="stream-line" :class="line.type">
            {{ line.text }}
          </div>
        </template>
        <div v-else class="stream-placeholder">等待匹配返回...</div>
      </div>
    </el-drawer>
    <el-button
      v-if="!matchStreamVisible && (matchStreamText || matchStreamRunning)"
      class="stream-expand-btn match-stream-expand-btn"
      type="primary"
      circle
      :icon="ArrowLeftBold"
      @click="matchStreamVisible = true"
    />

    <el-drawer v-model="matchDetailVisible" title="匹配解释面板" size="48%">
      <template v-if="currentMatch">
        <div class="detail-head">
          <el-progress type="dashboard" :percentage="currentMatch.matchScore || 0" :stroke-width="10" />
          <div class="detail-head-right">
            <h3>综合匹配度：{{ currentMatch.matchScore || 0 }}</h3>
            <p>简历ID：{{ currentMatch.resumeId || '-' }} ｜ 岗位ID：{{ currentMatch.jobId || '-' }}</p>
          </div>
        </div>
        <el-card shadow="never" class="inner-card mt-12">
          <template #header>AI 分析结论</template>
          <p class="analysis-text">{{ currentMatch.aiAnalysis || '暂无 AI 分析内容' }}</p>
        </el-card>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { getResumeJobMatchByPairApi, listJobApi, listResumeApi, listResumeInfoApi, listResumeJobMatchApi, matchResumeStreamApi } from '@/api/app';
import { useAuthStore } from '@/stores/auth';
import { ArrowLeftBold } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const usingResume = ref(false);
const matchingResume = ref(false);
const jobs = ref<any[]>([]);
const matchRows = ref<any[]>([]);
const resumeList = ref<any[]>([]);
const selectedResumeId = ref<string | null>(null);
const searchKeyword = ref('');
const matchKeyword = ref('');
const jobDetail = ref<any>(null);
const matchDetailVisible = ref(false);
const currentMatch = ref<any>(null);
const parseResult = ref<any>(null);
const matchResult = ref<any>(null);
const matchResultRaw = ref('');
const matchStreamVisible = ref(false);
const matchStreamText = ref('');
const matchStreamRunning = ref(false);
const matchStreamBoxRef = ref<HTMLElement | null>(null);
const jobQuery = reactive({ pageNum: 1, pageSize: 20, jobName: '' });

const filteredJobs = computed(() => {
  const key = searchKeyword.value.trim().toLowerCase();
  if (!key) return jobs.value;
  return jobs.value.filter((item) => `${item.jobName || ''} ${item.jobRequirement || ''} ${item.jobKeywords || ''}`.toLowerCase().includes(key));
});

const filteredMatchRows = computed(() => {
  const key = matchKeyword.value.trim().toLowerCase();
  return matchRows.value.filter((item) => {
    const byJob = jobDetail.value?.id ? item.jobId === jobDetail.value.id : true;
    const byKey = key ? `${item.aiAnalysis || ''} ${item.matchDetail || ''}`.toLowerCase().includes(key) : true;
    return byJob && byKey;
  });
});

const sortedFilteredMatchRows = computed(() => [...filteredMatchRows.value].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)));
const selectedResume = computed(() => resumeList.value.find((r) => String(r.id) === String(selectedResumeId.value)));
const compareIdDesc = (a: any, b: any) => {
  try {
    const ai = BigInt(String(a ?? '0'));
    const bi = BigInt(String(b ?? '0'));
    if (ai === bi) return 0;
    return ai > bi ? -1 : 1;
  } catch {
    return String(b ?? '').localeCompare(String(a ?? ''));
  }
};
const currentMatchRow = computed(() => {
  if (!selectedResumeId.value || !jobDetail.value?.id) return null;
  const rid = String(selectedResumeId.value);
  const jid = String(jobDetail.value.id);
  const rows = (matchRows.value || []).filter((r) => String(r.resumeId) === rid && String(r.jobId) === jid);
  if (!rows.length) return null;
  return [...rows].sort((a, b) => compareIdDesc(a.id, b.id) || (Number(b.matchScore || 0) - Number(a.matchScore || 0)))[0];
});

const effectiveMatch = computed(() => {
  const m = matchResult.value || {};
  const score = Number(m.matchScore || 0);
  if (score > 0 || m.aiAnalysis || m.matchDetail) return m;
  return currentMatchRow.value || {};
});

const displayMatchResult = computed(() => {
  const m = effectiveMatch.value || {};
  return Boolean(
    Number(m.matchScore || 0) > 0 ||
      Number(m.skillMatchRate || 0) > 0 ||
      Number(m.experienceMatchRate || 0) > 0 ||
      Number(m.educationMatchRate || 0) > 0 ||
      m.aiAnalysis ||
      m.matchDetail
  );
});

const displayMatchScore = computed(() => Math.max(0, Math.min(100, Number(effectiveMatch.value?.matchScore || 0))));
const displaySkillScore = computed(() => Math.max(0, Math.min(100, Number(effectiveMatch.value?.skillMatchRate || 0))));
const displayExpScore = computed(() => Math.max(0, Math.min(100, Number(effectiveMatch.value?.experienceMatchRate || 0))));
const displayEduScore = computed(() => Math.max(0, Math.min(100, Number(effectiveMatch.value?.educationMatchRate || 0))));
const displayAiAnalysis = computed(() => String(effectiveMatch.value?.aiAnalysis || ''));
const displayWhyText = computed(() => String(effectiveMatch.value?.matchDetail || effectiveMatch.value?.aiAnalysis || ''));
const matchStreamLines = computed(() =>
  (matchStreamText.value || '')
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      if (line.includes('匹配') || line.includes('评分') || line.includes('完成')) return { text: line, type: 'status' };
      if (line.startsWith('{') || line.startsWith('}') || line.includes('":') || line.includes('],') || line.includes('},')) {
        return { text: line, type: 'json' };
      }
      return { text: line, type: 'normal' };
    })
);
const normalizedSkillTags = computed(() => {
  const tags = parseResult.value?.skillTags;
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try {
      const arr = JSON.parse(tags);
      return Array.isArray(arr) ? arr : tags.split(/[,\s，、]+/).filter(Boolean);
    } catch {
      return tags.split(/[,\s，、]+/).filter(Boolean);
    }
  }
  return [];
});

const parseStatusText = (status: number) => {
  if (status === 2) return '已解析';
  if (status === 1) return '解析中';
  if (status === 3) return '解析失败';
  return '待解析';
};

const buildMatchParams = (resumeId: string) => ({
  resumeId: String(resumeId),
  jobId: String(jobDetail.value?.id || '')
});

const scrollMatchStreamToBottom = async () => {
  await nextTick();
  if (!matchStreamBoxRef.value) return;
  matchStreamBoxRef.value.scrollTop = matchStreamBoxRef.value.scrollHeight;
};

const parseMatchJsonFromText = (raw: string) => {
  const text = String(raw || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }
  const start = text.lastIndexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  return null;
};

const normalizeParsePreview = (raw: any) => {
  if (!raw) return {};
  let obj: any = raw;
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch {
      return {};
    }
  }
  return {
    name: obj.name || obj.userName || obj.realName || '',
    phone: obj.phone || obj.mobile || obj.tel || '',
    email: obj.email || obj.mail || '',
    address: obj.address || obj.city || '',
    jobIntention: obj.jobIntention || obj.intention || obj.targetJob || '',
    expectedSalary: obj.expectedSalary || obj.salaryExpectation || obj.salary || '',
    workYears: obj.workYears || obj.experienceYears || obj.workYear || '',
    education: obj.education || obj.educationLevel || obj.degree || '',
    projectExperience: obj.projectExperience || obj.projectExp || obj.projects || '',
    skillTags: obj.skillTags || obj.skills || obj.skill || []
  };
};

const useExistingResume = async () => {
  if (!selectedResumeId.value) return ElMessage.warning('请先选择一份已有简历');
  const resume = resumeList.value.find((r) => String(r.id) === String(selectedResumeId.value));
  if (!resume) return ElMessage.warning('未找到所选简历');
  const resumeId = String(selectedResumeId.value);
  if (!resumeId) return ElMessage.warning('简历ID无效，无法加载解析信息');
  usingResume.value = true;
  try {
    const info = await queryResumeInfo(resumeId);
    if (info) {
      parseResult.value = info;
    }
    ElMessage.success('已选择该简历，可直接匹配');
  } catch (e: any) {
    ElMessage.error(e?.message || '选择简历失败');
  } finally {
    usingResume.value = false;
  }
};

const matchSelectedResume = async () => {
  if (!selectedResume.value?.id) return ElMessage.warning('请先选择简历');
  if (Number(selectedResume.value.parseStatus) !== 2) return ElMessage.warning('该简历未解析完成，请先到个人中心上传并解析');
  const resumeId = String(selectedResumeId.value || '');
  if (!resumeId) return ElMessage.warning('简历ID无效，无法匹配');
  matchingResume.value = true;
  try {
    // 点击“开始匹配”时自动准备解析文档预览
    let info = parseResult.value;
    if (!info || !Object.keys(info).length) {
      const infoRes = await listResumeInfoApi({ pageNum: 1, pageSize: 1, resumeId });
      info = infoRes.rows?.[0] || null;
    }
    if (!info || !Object.keys(info).length) {
      info = normalizeParsePreview(selectedResume.value.parseContent || '');
    } else {
      info = normalizeParsePreview(info);
    }
    parseResult.value = info;

    matchStreamVisible.value = true;
    matchStreamRunning.value = true;
    matchStreamText.value = '开始岗位匹配与评分...\n等待后端流式返回中...\n';
    const matchParams = buildMatchParams(resumeId);
    await matchResumeStreamApi(matchParams, (chunk) => {
      matchStreamText.value += chunk;
      void scrollMatchStreamToBottom();
    });
    matchStreamText.value += '\n匹配流程结束，正在整理结果...';
    void scrollMatchStreamToBottom();
    const parsed = parseMatchJsonFromText(matchStreamText.value);
    matchResultRaw.value = parsed ? JSON.stringify(parsed, null, 2) : matchStreamText.value;
    try {
      matchResult.value = {
        matchScore: Number(parsed?.matchScore || 0),
        skillMatchRate: Number(parsed?.skillMatchRate || 0),
        experienceMatchRate: Number(parsed?.experienceMatchRate || 0),
        educationMatchRate: Number(parsed?.educationMatchRate || 0),
        matchDetail: parsed?.matchDetail || '',
        aiAnalysis: parsed?.aiAnalysis || ''
      };
    } catch {
      matchResult.value = {};
      ElMessage.warning('匹配流未返回标准JSON，已显示过程原文');
    }
    ElMessage.success('匹配完成');
    await loadMatch();
  } catch (e: any) {
    ElMessage.error(e?.message || '匹配失败');
  } finally {
    matchStreamRunning.value = false;
    matchingResume.value = false;
  }
};

const checkMatchedBefore = async () => {
  if (!selectedResumeId.value) return ElMessage.warning('请先选择简历');
  if (!jobDetail.value?.id) return ElMessage.warning('岗位ID无效');
  try {
    const rid = String(selectedResumeId.value);
    const jid = String(jobDetail.value.id);
    const detail = await getResumeJobMatchByPairApi({ resumeId: rid, jobId: jid });
    const data = detail?.data;
    if (!data) {
      ElMessage.info(detail?.msg || '该简历在当前岗位暂无历史匹配记录');
      return;
    }
    matchResult.value = {
      matchScore: Number(data?.matchScore || 0),
      skillMatchRate: Number(data?.skillMatchRate || 0),
      experienceMatchRate: Number(data?.experienceMatchRate || 0),
      educationMatchRate: Number(data?.educationMatchRate || 0),
      matchDetail: data?.matchDetail || '',
      aiAnalysis: data?.aiAnalysis || ''
    };
    matchResultRaw.value = JSON.stringify(data, null, 2);
    ElMessage.success('已加载历史匹配结果');
  } catch (e: any) {
    ElMessage.error(e?.message || '查询历史匹配失败');
  }
};

const onResumeChanged = async () => {
  parseResult.value = null;
  matchResult.value = null;
  matchResultRaw.value = '';
  if (!selectedResumeId.value || !jobDetail.value?.id) return;
  await useExistingResume();
  await checkMatchedBefore();
};

const queryResumeInfo = async (resumeId: string) => {
  const infoRes = await listResumeInfoApi({ pageNum: 1, pageSize: 1, resumeId });
  return infoRes.rows?.[0];
};

const loadJobs = async () => {
  const res = await listJobApi(jobQuery);
  jobs.value = res.rows || [];
};

const loadMatch = async () => {
  const res = await listResumeJobMatchApi({ pageNum: 1, pageSize: 20 });
  matchRows.value = res.rows || [];
};

const loadResumeList = async () => {
  const res = await listResumeApi({ pageNum: 1, pageSize: 100 });
  resumeList.value = res.rows || [];
};

const parseTextKeywords = (text?: string) =>
  (text || '')
    .split(/[,\n，;；、\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2);

const openJobDetailPage = (job: any) => {
  jobDetail.value = job;
  matchKeyword.value = '';
  selectedResumeId.value = null;
  parseResult.value = null;
  matchResult.value = null;
  matchResultRaw.value = '';
  loadResumeList();
};

const backToJobList = () => {
  jobDetail.value = null;
};
const openMatchDetail = (row: any) => {
  currentMatch.value = row;
  matchDetailVisible.value = true;
};
const refreshAll = async () => Promise.all([loadJobs(), loadMatch(), loadResumeList()]);
const logout = () => {
  auth.logout();
  router.push('/app/login');
};

onMounted(async () => {
  await refreshAll();
});

watch(matchStreamVisible, (val) => {
  if (val) void scrollMatchStreamToBottom();
});
</script>
