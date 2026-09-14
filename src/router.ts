import { reactive, computed } from 'vue'

// 极简 hash 路由：#/bookings、#/booking/b-001 等
interface RouteState {
  path: string
  params: string[]
  query: Record<string, string>
}

function parse(): RouteState {
  const hash = window.location.hash.replace(/^#/, '') || '/dashboard'
  const [pathPart, queryPart] = hash.split('?')
  const params = pathPart.split('/').filter(Boolean)
  const query: Record<string, string> = {}
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const [k, v] = pair.split('=')
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? '')
    }
  }
  return { path: '/' + params.join('/'), params, query }
}

const route = reactive<RouteState>(parse())
window.addEventListener('hashchange', () => {
  const r = parse()
  route.path = r.path
  route.params = r.params
  route.query = r.query
})

export function useRouter() {
  return {
    route,
    current: computed(() => route),
    push(path: string) {
      window.location.hash = path
    },
    back() {
      history.back()
    }
  }
}
