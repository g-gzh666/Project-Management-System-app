<template>
  <div class="login-wrap login-wrap-pro">
    <div class="login-decor decor-a"></div>
    <div class="login-decor decor-b"></div>
    <div class="login-panel login-panel-pro">
      <div class="login-brand">
        <h1>智能简历匹配平台</h1>
        <p>一键上传简历，AI 解析并快速匹配岗位</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="auth-form">
        <el-form-item label="账号" prop="account">
          <el-input v-model="form.account" placeholder="请输入账号" size="large" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" size="large" />
        </el-form-item>
        <el-button type="primary" :loading="loading" size="large" class="full-btn" @click="onLogin">登录</el-button>
      </el-form>
      <div class="auth-footer">
        <span>还没有账号？</span>
        <el-button link type="primary" @click="router.push('/app/register')">立即注册</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { loginApi } from '@/api/app';
import { useAuthStore } from '@/stores/auth';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({ account: '18187031956', password: '123456' });
const rules: FormRules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const onLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    // 避免旧token干扰公开登录接口
    auth.logout();
    const res = await loginApi({ account: form.account, password: form.password, userName: form.account });
    auth.setLogin({
      token: res.data.access_token,
      clientId: res.data.Clientid || import.meta.env.VITE_APP_CLIENT_ID || 'web_app',
      user: {
        id: res.data.id,
        account: form.account,
        nickName: res.data.nick_name || form.account,
        avatar: res.data.avatar,
        phone: res.data.phone
      }
    });
    ElMessage.success('登录成功');
    router.push('/app/home');
  } catch (e: any) {
    ElMessage.error(e?.message || '登录失败');
  } finally {
    loading.value = false;
  }
};
</script>
