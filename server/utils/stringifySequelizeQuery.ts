function stringifySequelizeQuery(findOptions: unknown): string {
  function isClass(func: unknown): boolean {
    return typeof func === 'function' && /^class\s/.test(func.toString())
  }

  function replacer(this: unknown, key: string, value: unknown): unknown {
    if (typeof value === 'object' && value !== null) {
      const symbols = Object.getOwnPropertySymbols(value).reduce<Record<string, unknown>>((acc, sym) => {
        acc[sym.toString()] = (value as Record<symbol, unknown>)[sym]
        return acc
      }, {})

      return { ...(value as object), ...symbols }
    }

    if (isClass(value)) {
      return `${(value as { name: string }).name}`
    }

    return value
  }

  return JSON.stringify(findOptions, replacer)
}

export = stringifySequelizeQuery
