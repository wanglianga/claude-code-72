<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ROLE_META } from '@/rules'
import type { Role } from '@/types'

const auth = useAuthStore()
const username = ref('')
const password = ref('')
const err = ref('')

const demoAccounts: { role: Role; username: string; desc: string }[] = [
  { role: 'resident', username: 'wangxiulan', desc: '居民·邻里宴组织者' },
  { role: 'resident', username: 'yggy', desc: '阳光公益·公益课堂（免押）' },
  { role: 'resident', username: 'lzcs', desc: '绿洲餐社·商业试吃' },
  { role: 'admin', username: 'admin', desc: '厨房管理员·核验/验收/押金' },
  { role: 'cleaner', username: 'cleaner', desc: '保洁·食材混放/补清洁' },
  { role: 'repair', username: 'repair', desc: '维修·设备损坏定损' },
  { role: 'staff', username: 'staff', desc: '社区工作人员·审批/调解/公示' }
]

function login() {
  err.value = ''
  const r = auth.login(username.value, password.value)
  if (!r.ok) err.value = r.msg ?? '登录失败'
}

function quick(u: string) {
  username.value = u
  password.value = '123456'
  err.value = ''
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-emoji">🍲</div>
        <h1>邻里共享厨房</h1>
        <p class="muted">预约 · 使用前核验 · 使用中协同 · 逐项验收 · 押金与公示</p>
      </div>
      <div class="login-form card tight">
        <h3>登录</h3>
        <div class="field">
          <label>用户名</label>
          <input v-model="username" placeholder="请输入用户名" @keyup.enter="login" />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="演示密码：123456" @keyup.enter="login" />
        </div>
        <div v-if="err" class="error-text" style="margin-bottom: 8px">{{ err }}</div>
        <button class="btn primary block" @click="login">登 录</button>
        <hr class="divider" />
        <div class="small muted" style="margin-bottom: 8px">演示账号 · 点击自动填入（密码统一 123456）：</div>
        <div class="acct-grid">
          <button v-for="a in demoAccounts" :key="a.username" class="acct-btn" @click="quick(a.username)">
            <span class="acct-role">{{ ROLE_META[a.role].icon }} {{ a.desc }}</span>
            <span class="acct-user mono">{{ a.username }}</span>
          </button>
        </div>
      </div>
      <div class="small muted login-foot">
        公益课堂 / 邻里宴 / 商业试吃 适用不同押金、清洁与公示规则 · 数据保存在浏览器本地
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-card { width: 460px; max-width: 100%; }
.login-brand { text-align: center; margin-bottom: 18px; }
.brand-emoji { font-size: 46px; }
.login-form { padding: 20px; }
.login-foot { text-align: center; margin-top: 14px; }
.acct-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.acct-btn {
  text-align: left; border: 1px solid var(--c-border); background: var(--c-surface-2);
  border-radius: 7px; padding: 7px 10px; cursor: pointer; font-family: inherit;
  display: flex; flex-direction: column; gap: 2px;
}
.acct-btn:hover { border-color: var(--c-brand); background: var(--c-brand-soft); }
.acct-role { font-size: 12px; color: var(--c-text); }
.acct-user { font-size: 11px; color: var(--c-text-3); }
</style>
