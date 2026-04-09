<template>
  <div class="app-shell boss-shell">
    <header class="boss-header">
      <div>
        <h2>个人中心</h2>
        <span>管理个人信息与附件简历（上传并流式展示解析过程）</span>
      </div>
      <el-space>
        <el-button type="primary" plain @click="router.push('/app/home')">返回岗位广场</el-button>
      </el-space>
    </header>

    <section class="profile-page-grid">
      <el-card class="glass-card" shadow="hover">
        <template #header>个人信息</template>
        <div class="profile-avatar-block">
          <el-avatar :src="profileForm.avatar || ''" :size="72">{{ (profileForm.nickName || profileForm.account || 'U').slice(0, 1) }}</el-avatar>
          <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" :on-change="onAvatarSelect">
            <el-button size="small">更换头像</el-button>
          </el-upload>
        </div>
        <el-form :model="profileForm" label-width="72px">
          <el-form-item label="账号">
            <el-input v-model="profileForm.account" disabled />
          </el-form-item>
          <el-form-item label="昵称">
            <el-input v-model="profileForm.nickName" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="profileForm.phone" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="profileForm.email" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="profileSaving" @click="saveProfile">保存资料</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="glass-card" shadow="hover">
        <template #header>附件简历</template>
        <el-upload :auto-upload="false" :limit="1" accept=".pdf" :on-change="onPdfSelect">
          <el-button type="primary" round>选择 PDF 简历</el-button>
        </el-upload>
        <el-button class="mt-12" type="success" round :loading="uploading" @click="uploadAndParseResume">上传并开始解析</el-button>
        <div class="tip mt-8">调用 parse 接口完成上传+入库+流式解析，右侧实时展示。</div>

        <el-divider />
        <el-table :data="resumeList" max-height="420">
          <el-table-column prop="originalName" label="文件名" min-width="180" />
          <el-table-column prop="fileSize" label="大小(KB)" width="90" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.parseStatus)">{{ statusText(row.parseStatus) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-space>
                <el-button link type="primary" @click="previewResume(row)">预览</el-button>
                <el-button link type="success" @click="openResumeDetail(row)">查看详情</el-button>
              </el-space>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>

    <el-drawer v-model="parseDrawerVisible" title="简历解析过程（流式输出）" direction="rtl" size="42%">
      <div class="stream-meta">
        <el-tag :type="parsing ? 'warning' : 'success'">{{ parsing ? '解析中' : '解析完成' }}</el-tag>
      </div>
      <div ref="streamBoxRef" class="stream-output pretty-stream">
        <template v-if="streamLines.length">
          <div v-for="(line, idx) in streamLines" :key="`${idx}-${line.text}`" class="stream-line" :class="line.type">
            {{ line.text }}
          </div>
        </template>
        <div v-else class="stream-placeholder">等待解析返回...</div>
      </div>
    </el-drawer>

    <el-button
      v-if="!parseDrawerVisible"
      class="stream-expand-btn"
      type="primary"
      circle
      :icon="ArrowLeftBold"
      @click="parseDrawerVisible = true"
    />

    <el-dialog v-model="detailVisible" title="简历详情" width="720px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="文件名">{{ detailRecord?.originalName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusText(Number(detailRecord?.parseStatus || 0)) }}</el-descriptions-item>
        <el-descriptions-item label="大小(KB)">{{ detailRecord?.fileSize ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="简历ID">{{ detailRecord?.id ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="文件地址" :span="2">
          <el-link v-if="detailRecord?.filePath" :href="detailRecord.filePath" target="_blank" type="primary">打开附件链接</el-link>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-space>
          <el-button @click="detailVisible = false">关闭</el-button>
          <el-button type="primary" :disabled="!detailRecord?.parseContent" @click="openParsedResult">查看解析后的结果</el-button>
        </el-space>
      </template>
    </el-dialog>

    <el-dialog v-model="parsedVisible" title="解析结果" width="760px">
      <div class="parsed-result-box">{{ formatParsedContent(detailRecord?.parseContent) }}</div>
      <template #footer>
        <el-button type="primary" @click="parsedVisible = false">我知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { getResumeDetailApi, getUserByAccountApi, listResumeApi, parseResumeStreamApi, updateAppUserApi, uploadAvatarApi } from '@/api/app';
import { ArrowLeftBold } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { ElMessage } from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const auth = useAuthStore();
const uploading = ref(false);
const profileSaving = ref(false);
const selectedPdf = ref<File | null>(null);
const resumeList = ref<any[]>([]);
const parseDrawerVisible = ref(false);
const parsing = ref(false);
const streamText = ref('');
const streamBoxRef = ref<HTMLElement | null>(null);
const detailVisible = ref(false);
const parsedVisible = ref(false);
const detailRecord = ref<any>(null);

const profileForm = reactive({
  account: auth.user.account || '',
  nickName: auth.user.nickName || '',
  phone: auth.user.phone || '',
  email: auth.user.email || '',
  avatar: auth.user.avatar || ''
});

const statusText = (status: number) => (status === 2 ? '已解析' : status === 1 ? '解析中' : status === 3 ? '失败' : '待解析');
const statusTag = (status: number) => (status === 2 ? 'success' : status === 1 ? 'warning' : status === 3 ? 'danger' : 'info');

const onPdfSelect = (file: any) => (selectedPdf.value = file.raw);

const loadResumeList = async () => {
  const res = await listResumeApi({ pageNum: 1, pageSize: 100 });
  resumeList.value = res.rows || [];
};

const streamLines = computed(() =>
  (streamText.value || '')
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      if (line.includes('解析') || line.includes('开始') || line.includes('完成')) return { text: line, type: 'status' };
      if (line.startsWith('{') || line.startsWith('}') || line.includes('":') || line.includes('],') || line.includes('},')) {
        return { text: line, type: 'json' };
      }
      return { text: line, type: 'normal' };
    })
);

const scrollStreamToBottom = async () => {
  await nextTick();
  if (!streamBoxRef.value) return;
  streamBoxRef.value.scrollTop = streamBoxRef.value.scrollHeight;
};

const previewResume = (row: any) => {
  if (!row?.filePath) return ElMessage.warning('该简历暂无可预览地址');
  window.open(row.filePath, '_blank');
};

const openResumeDetail = async (row: any) => {
  if (!row?.id) return ElMessage.warning('简历记录缺少ID');
  try {
    const res = await getResumeDetailApi(Number(row.id));
    detailRecord.value = res?.data || row;
    detailVisible.value = true;
  } catch (e: any) {
    ElMessage.error(e?.message || '加载简历详情失败');
  }
};

const openParsedResult = () => {
  if (!detailRecord.value?.parseContent) return ElMessage.warning('当前简历暂无解析结果');
  parsedVisible.value = true;
};

const formatParsedContent = (content?: string) => {
  if (!content) return '暂无解析结果';
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
};

const uploadAndParseResume = async () => {
  if (!selectedPdf.value) return ElMessage.warning('请先选择 PDF 文件');
  const uploadFile = selectedPdf.value;
  parseDrawerVisible.value = true;
  parsing.value = true;
  streamText.value = '开始流式解析...\n';
  uploading.value = true;
  try {
    await parseResumeStreamApi(uploadFile, (chunk) => {
      streamText.value += chunk;
      void scrollStreamToBottom();
    });
    streamText.value += '\n\n解析结束。';
    void scrollStreamToBottom();
    await loadResumeList();
    ElMessage.success('简历解析完成');
    selectedPdf.value = null;
  } catch (e: any) {
    ElMessage.error(e?.message || '流式解析失败');
  } finally {
    parsing.value = false;
    uploading.value = false;
  }
};

const onAvatarSelect = async (file: any) => {
  if (!file?.raw) return;
  try {
    const upload = await uploadAvatarApi(file.raw as File);
    profileForm.avatar = upload.data.url;
    ElMessage.success('头像上传成功');
  } catch (e: any) {
    ElMessage.error(e?.message || '头像上传失败');
  }
};

const saveProfile = async () => {
  profileSaving.value = true;
  try {
    if (!auth.user?.id) {
      ElMessage.error('用户ID缺失，无法保存');
      return;
    }
    await updateAppUserApi({
      id: auth.user.id,
      account: profileForm.account,
      userName: profileForm.nickName,
      nickName: profileForm.nickName,
      avatar: profileForm.avatar,
      phone: profileForm.phone,
      email: profileForm.email
    });
    auth.updateUser({
      account: profileForm.account,
      nickName: profileForm.nickName,
      avatar: profileForm.avatar,
      phone: profileForm.phone,
      email: profileForm.email
    });
    await loadProfile();
    ElMessage.success('个人资料已保存');
  } finally {
    profileSaving.value = false;
  }
};

const loadProfile = async () => {
  const account = profileForm.account || auth.user.account;
  if (!account) return;
  try {
    const res = await getUserByAccountApi(account);
    const u = res?.data || {};
    profileForm.account = u.account || profileForm.account || '';
    profileForm.nickName = u.userName || u.nickName || profileForm.nickName || '';
    profileForm.phone = u.phone || profileForm.phone || '';
    profileForm.email = u.email || profileForm.email || '';
    profileForm.avatar = u.avatar || profileForm.avatar || '';
    auth.updateUser({
      account: profileForm.account,
      nickName: profileForm.nickName,
      avatar: profileForm.avatar,
      phone: profileForm.phone,
      email: profileForm.email
    });
  } catch {
    // 回显失败时保持本地已有值
  }
};

onMounted(async () => {
  await loadProfile();
  await loadResumeList();
});

watch(parseDrawerVisible, (val) => {
  if (val) void scrollStreamToBottom();
});
</script>
