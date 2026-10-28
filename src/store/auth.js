// 前端登录态管理（简单版，仅作演示）。
// 真实项目应改为后端签发 token；这里使用 localStorage 持久化，刷新页面仍保持登录。
// 默认账号 / 密码：见 docs，可在 store 常量处修改。
const STORAGE_KEY = 'ps_auth_user'
const DEFAULT_USER = {
  username: 'admin',
  password: '123456',
  nickname: '管理员'
}

export const auth = {
  login(username, password) {
    if (username && password && username === DEFAULT_USER.username && password === DEFAULT_USER.password) {
      const user = { username: username, nickname: DEFAULT_USER.nickname, loginAt: Date.now() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      return user
    }
    return null
  },
  logout() {
    localStorage.removeItem(STORAGE_KEY)
  },
  currentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  isLoggedIn() {
    return !!this.currentUser()
  }
}

export const DEFAULT_ACCOUNT = {
  username: DEFAULT_USER.username,
  password: DEFAULT_USER.password
}