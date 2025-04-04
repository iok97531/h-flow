import _ from 'lodash'

interface Function {
  (...args: any[]): any
  name?: string
}

interface WrapHofOptions {
  isChainCancelable?: boolean
  resultName?: string
}

interface WrapHofResults {
  [key: string]: any
}

interface HFlowContext {
  args: Array<any>
  results: Object
}

interface HFlowOptions {
  isReturnArgs?: boolean
  returnOnly?: string
}

interface HFlowResult<T = any> {
  args: Array<any>
  results: Record<string, T>
}

type HFlowReturnType<T = any> = HFlowResult<T> | T | Record<string, T> | null

export const flowPromise = (functions: Array<Function>): Function => {
  if (_.isEmpty(functions) || !_.isArray(functions))
    return () => {}
  
  return async (args: Array<any>) => {
    let a = args
    
    for (let i = 0; i < _.size(functions); i++) {
      const func = functions[i]
      a = await func(a)
    }
  
    return a
  }
}

const checkContextExist = (func: Function): Function => {
  return (context: Object) => {
    if (!context)
      return () => {}
    else
      return func(context)
  }
}

export const wrapHof = (func: Function, args: any, options: WrapHofOptions): Function => {
  const {
    isChainCancelable = true,
    resultName = ''
  } = options
  
  return (context: HFlowContext) =>{
    if (!_.isFunction(func))
      return () => {}
  
    const _args = _.isFunction(args) ? args(context) : args
    const __args = _.isArray(_args) ? _args : [_args]
      
    const result = func(...__args)
  
      
    if (isChainCancelable && !result)
      return null
    else {
      let results: WrapHofResults = {}
      
      if (resultName) {
        results[resultName] = result
      } else if (func.name) {
        results[func.name] = result
      } else {
        results._temp = result
      }
      
      _.merge(context.results, results)
      return context
    }
  }
}

export const wrapHofPromise = (func: Function, args: any, options: WrapHofOptions) => {
  const {
    isChainCancelable = true,
    resultName = ''
  } = options
  
  return async(context: HFlowContext) =>{
    return new Promise(async (resolve, reject) => {
      if (!_.isFunction(func))
        resolve(null)
      
      const _args = _.isFunction(args) ? args(context) : args
      const __args = _.isArray(_args) ? _args : [_args]
      
      try {
        const result = await func(...__args)

        if (isChainCancelable && !result)
          resolve(null)
        else {
          let results: WrapHofResults = {}
          
          if (resultName) {
            results[resultName] = result
          } else if (func.name) {
            results[func.name] = result
          } else {
            results._temp = result
          }
          
          _.merge(context.results, results)
          resolve(context)
        }
      } catch (err) {
        reject(err)
      }
    })
  }
}

const createContext = (args: Array<any>): HFlowContext => ({
  args,
  results: {}
})

const processReturnValue = <T = any>(
  context: HFlowResult<T>,
  options: HFlowOptions
): HFlowReturnType<T> => {
  const { isReturnArgs, returnOnly } = options

  if (!context) {
    return null
  }

  if (isReturnArgs) {
    return context
  }

  if (returnOnly) {
    return context.results[returnOnly]
  }

  return context.results
}

export const hFlow = <T = any>(
  functions: Function | Function[],
  options: HFlowOptions = {}
): (...args: Array<any>) => HFlowReturnType<T> => {
  return (...args: Array<any>) => {
    const _functions = _.isFunction(functions) ? functions(...args) : functions
    const __functions = _.map(_functions, checkContextExist)
    const mergedFunction = _.flow(__functions)
    
    const context = createContext(args)
    const _context = mergedFunction(context)
    
    return processReturnValue(_context, options)
  }
}

export const hFlowPromise = (functions: any, options: HFlowOptions = {}) => {
  return (...args: Array<any>) => {
    return new Promise(async (resolve, reject) => {
      const {
        isReturnArgs = false,
        returnOnly
      } = options
      
      const _functions = _.isFunction(functions) ? functions(...args) : functions
      const __functions = _.map(_functions, (func) => checkContextExist(func))
      const mergedFunction = flowPromise(__functions)
      
      const context = createContext(args)

      try {
        const _context = await mergedFunction(context)
        if  (!_context) {
          resolve(_context)
        }
        
        if (isReturnArgs) {
          resolve(_context)
        } else if (returnOnly) {
          resolve(_context?.results[returnOnly])
        } else {
          resolve(_context?.results || {})
        }
      } catch (err) {
        console.log('makeFunctionPromise err: ', err)
        reject(err)
      }
    }
  )}
}