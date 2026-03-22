/**
 * Handle timeouts greater than the 32-bit signed integer limit (~24.8 days).
 */
class LongTimeout {
  timeout: number
  timer: ReturnType<typeof setTimeout> | null

  constructor() {
    this.timeout = 0
    this.timer = null
  }

  clear(): void {
    clearTimeout(this.timer!)
  }

  /**
   * @param fn Callback to invoke when the timeout elapses.
   * @param timeout Duration in milliseconds.
   */
  set(fn: () => void, timeout: number): void {
    const maxValue = 2147483647

    const handleTimeout = () => {
      if (this.timeout > 0) {
        const delay = Math.min(this.timeout, maxValue)
        this.timeout = this.timeout - delay
        this.timer = setTimeout(handleTimeout, delay)
        return
      }
      fn()
    }

    this.timeout = timeout
    handleTimeout()
  }
}

export = LongTimeout
