import VNode, {createEmptyVNode} from './vnode.js'

class Vue {
  constructor (options) {
    this.$options = options

    this.proxy = this.initDataProxy()
    this.initWatch()

    return this.proxy
  }
  $watch (key, cb) {
    this.dataNotifyChain[key] = this.dataNotifyChain[key] || []
    this.dataNotifyChain[key].push(cb)
  }
  $mount (root) {
    const { mounted, render } = this.$options

    const vnode = render.call(this.proxy, this.createElement)
    this.$el = this.createElm(vnode)

    if (root) {
     root.appendChild(this.$el)
    }

    mounted && mounted.call(this.proxy)

    return this
  }
  update () {
    const parent = this.$el.parent

    if (parent) {
      parent.removeChild(this.$el)
    }

    const vnode = this.$options.render.call(this.proxy, this.createElement)
    this.$el = this.patch(null, vnode)

    if (parent) {
      parent.appendChild(this.$el)
    }
  }
  patch (oldVnode, newVnode) {
    return this.createElm(newVnode)
  }
  createElement(tag, data, children) {
    return new VNode(tag, data, children)
  }
  createElm (vnode) {
    const el = document.createElement(vnode.tag)

    for (let key in vnode.data) {
      el.setAttribute(key, vnode.data[key]);
    }

    // set dom eventlistener
    const events = (vnode.data || {}).on || {}
    for (let key in events) {
      el.addEventListener(key, events[key])
    }

    if (!Array.isArray(vnode.children)) {
      el.textContent = vnode.children + ''
    } else {
      vnode.children.forEach(child => {
        if (typeof child === 'string') {
          el.textContent = child
        } else {
          el.appendChild(createElm(child))
        }
      });
    }

    return el
  }
  initDataProxy () {
    const data = this.$options.data ? this.$options.data() : {}

    // https://stackoverflow.com/questions/37714787/can-i-extend-proxy-with-an-es2015-class
    return new Proxy(this, {
      set: (_, key, value) => {
        if (key in data) { // 优先设置data
          const pre = data[key]
          data[key] = value
          this.notifyDataChange(key, pre, value)
        } else {
          this[key] = value
        }

        return true
      },
      get: (_, key) => {
        const methods = this.$options.methods || {}

        if (key in data) { // 优先取data
          this.$watch(key, this.update.bind(this)) // 依赖收集
          return data[key]
        } 
        if (key in methods) return methods[key].bind(this.proxy)
        else return this[key]
      }
    })
  }
  initWatch () {
    this.dataNotifyChain = {}
  }
  notifyDataChange (key, pre, val) {
    (this.dataNotifyChain[key] || []).forEach(cb => cb(pre, val))
  }
}

export default Vue