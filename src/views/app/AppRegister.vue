<template>
  <div class="login-wrap login-wrap-pro">
    <div class="login-decor decor-a"></div>
    <div class="login-decor decor-b"></div>
    <div class="login-panel login-panel-pro">
      <div class="login-brand">
        <h1>创建用户账号</h1>
        <p>注册后即可进入简历上传与岗位匹配流程</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="auth-form">
        <el-form-item label="账号" prop="account">
          <el-input v-model="form.account" placeholder="请输入账号" size="large" />
        </el-form-item>
        <el-form-item label="昵称" prop="userName">
          <el-input v-model="form.userName" placeholder="请输入昵称" size="large" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" size="large" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱（可选）" size="large" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" size="large" />
        </el-form-item>
        <el-button type="primary" :loading="loading" size="large" class="full-btn" @click="onRegister">注册</el-button>
      </el-form>
      <div class="auth-footer">
        <span>已有账号？</span>
        <el-button link type="primary" @click="router.push('/app/login')">返回登录</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { registerApi } from '@/api/app';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  account: '',
  userName: '',
  phone: '',
  email: '',
  password: ''
});

const rules: FormRules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  userName: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const onRegister = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    await registerApi({
      account: form.account,
      userName: form.userName,
      phone: form.phone,
      email: form.email,
      password: form.password
    });
    ElMessage.success('注册成功，请登录');
    router.push('/app/login');
  } catch (e: any) {
    ElMessage.error(e?.message || '注册失败');
  } finally {
    loading.value = false;
  }
};
</script>
