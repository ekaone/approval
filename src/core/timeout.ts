export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T,
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((resolve) => {
    timerId = setTimeout(() => resolve(onTimeout()), ms)
  })
  return Promise.race([
    promise.then((v) => {
      clearTimeout(timerId)
      return v
    }),
    timeoutPromise,
  ])
}
