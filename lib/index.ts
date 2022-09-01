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

export const hFlow = (functions: any, options: HFlowOptions = {}) => {
  return (...args: Array<any>) => {
    const {
      isReturnArgs = false,
      returnOnly
    } = options

    const _functions = _.isFunction(functions) ? functions(...args) : functions
    const __functions = _.map(_functions, (func) => checkContextExist(func))
    const mergedFunction = _.flow(__functions)
    
    const context: HFlowContext = {
      args: args,
      results: {}
    }

    const _context = mergedFunction(context)

    if (!_context)
      return _context
    
    if (isReturnArgs) {
      return _context
    } else if (returnOnly) {
      return _context?.results[returnOnly]
    } else {
      return _context?.results || {}
    }
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
      
      const context: HFlowContext = {
        args: args,
        results: {}
      } 

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