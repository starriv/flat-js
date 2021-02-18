"use strict"
import ts from "typescript"
import { isSmallNumber, OpCode, TEXT_DADA_MASK, VariableType } from "./main"

const enum FrameType {
    Function,
    Try
}

type Scope = Record<string, any>

const enum Fields {
    type,
    scopes,
    valueStack,
    return,
    catch,
    variable,
    name,
    tdz,
    immutable,
    value
}

type FunctionFrame = {
    [Fields.type]: FrameType.Function,
    [Fields.scopes]: Scope[],
    [Fields.valueStack]: any[]
    [Fields.return]: number
}

type TryFrame = {
    [Fields.type]: FrameType.Try,
    // scope snapshot
    [Fields.scopes]: Scope[],
    // ref to frame's valueStack
    [Fields.valueStack]: any[]
    [Fields.catch]: number,
    [Fields.variable]: string
}

type Frame = FunctionFrame | TryFrame

type Stack = Frame[]

type VariableRecord = {
    [Fields.type]: VariableType
    [Fields.name]: string
}

type VariableDescriptor = {
    [Fields.tdz]: boolean,
    [Fields.immutable]: boolean,
    [Fields.value]: any
}

export function run(program: number[], textData: any[], entryPoint: number = 0, scopes: Scope[] = [], self: undefined = undefined, args: any[] = []) {
    const environments = new WeakSet()
    const initialFrame: Frame = {
        [Fields.type]: FrameType.Function,
        [Fields.scopes]: scopes,
        [Fields.valueStack]: [
            self,
            ...args,
            args.length
        ],
        [Fields.return]: -1
    }

    environments.add(initialFrame)

    const stack: Stack = [initialFrame]
    let ptr: number = entryPoint

    const read = () => program[ptr++]
    const getCurrentFrame = () => stack[stack.length - 1]
    const peak = <T>(arr: T[], offset = 1): T => arr[arr.length - offset]

    const variableDescriptors = new WeakMap<Scope, Map<string, VariableDescriptor>>()

    const defineVariableInternal = (scope: Scope, name: string, tdz: boolean, immutable: boolean) => {
        if (!variableDescriptors.has(scope)) {
            variableDescriptors.set(scope, new Map())
        }

        const descriptor = {
            [Fields.tdz]: tdz,
            [Fields.immutable]: immutable,
            [Fields.value]: undefined
        }

        variableDescriptors.get(scope)!.set(name, descriptor)

        Reflect.defineProperty(scope, name, {
            configurable: true,
            get() {
                if (descriptor[Fields.tdz]) {
                    throw new ReferenceError(`${name} no defined`)
                }
                return descriptor[Fields.value]
            },
            set(v) {
                if (descriptor[Fields.tdz]) {
                    throw new ReferenceError(`${name} no defined`)
                }
                if (descriptor[Fields.immutable]) {
                    throw new ReferenceError(`${name} is a constant`)
                }
                descriptor[Fields.value] = v
            }
        })
    }

    const defineVariable = (scope: Scope, name: string, type: VariableType) => {
        switch (type) {
            case VariableType.Const:
                // seal it later
                return defineVariableInternal(scope, name, true, false)
            case VariableType.Let:
                return defineVariableInternal(scope, name, true, false)
            case VariableType.Function:
            case VariableType.Parameter:
            case VariableType.Var:
                //don't have tdz
                return defineVariableInternal(scope, name, false, false)
        }
    }
    const getVariableDescriptor = (scope: Scope, name: string) => {
        const map = variableDescriptors.get(scope)
        if (map) {
            return map.get(name)
        }
    }

    type FunctionDescriptor = {
        name: string,
        type: ts.SyntaxKind,
        offset: number,
        scopes: Scope[]
    }

    const functionDescriptors = new WeakMap<any, FunctionDescriptor>()

    const defineFunction = (scopes: Scope[], name: string, type: ts.SyntaxKind, offset: number) => {
        // TODO: types
        const scopeClone = [...scopes]

        const des: FunctionDescriptor = {
            name,
            type,
            offset,
            scopes: scopeClone
        }

        const fn = function (this: any, ...args: any[]) {
            return run(program, textData, offset, scopeClone, this, args)
        }

        functionDescriptors.set(fn, des)

        return fn
    }

    const getValue = (ctx: any, name: string) => {
        if (!environments.has(ctx)) {
            return ctx[name]
        } else {
            const env: Frame = ctx
            for (let i = env[Fields.scopes].length - 1; i >= 0; i--) {
                if (Reflect.has(env[Fields.scopes][i], name)) {
                    return env[Fields.scopes][i][name]
                }
            }

            throw new ReferenceError(`Non exist variable ${name}`)
        }
    }

    while (ptr >= 0 && ptr < program.length) {
        const command: OpCode = read()
        const currentFrame = getCurrentFrame()
        switch (command) {
            case OpCode.Literal: {
                const value = read()
                if (isSmallNumber(value)) {
                    currentFrame[Fields.valueStack].push(value)
                } else {
                    currentFrame[Fields.valueStack].push(textData[value ^ TEXT_DADA_MASK])
                }
            }
                break;
            case OpCode.Pop:
                currentFrame[Fields.valueStack].pop()
                break
            case OpCode.GetRecord:
                currentFrame[Fields.valueStack].push(currentFrame)
                break
            case OpCode.NullLiteral:
                currentFrame[Fields.valueStack].push(null)
                break
            case OpCode.UndefinedLiteral:
                currentFrame[Fields.valueStack].push(undefined)
                break
            case OpCode.Set: {
                const value = currentFrame[Fields.valueStack].pop()
                const name = currentFrame[Fields.valueStack].pop()
                const ctx = currentFrame[Fields.valueStack].pop()

                if (!environments.has(ctx)) {
                    ctx[name] = value
                } else {
                    let hit = false

                    for (let i = currentFrame[Fields.scopes].length - 1; i >= 0; i--) {
                        if (Reflect.has(currentFrame[Fields.scopes][i], name)) {
                            hit = true
                            currentFrame[Fields.scopes][i][name] = value
                            break
                        }
                    }

                    if (!hit) {
                        throw new ReferenceError(`Non exist variable ${name}`)
                    }
                }

                currentFrame[Fields.valueStack].push(value)
            }
                break;
            case OpCode.Get: {
                const name = currentFrame[Fields.valueStack].pop()
                const ctx = currentFrame[Fields.valueStack].pop()

                currentFrame[Fields.valueStack].push(getValue(ctx, name))
            }
                break;
            case OpCode.Jump: {
                const pos = currentFrame[Fields.valueStack].pop()
                ptr = pos
            }
                break;
            case OpCode.JumpIfNot: {
                const value = currentFrame[Fields.valueStack].pop()
                const pos = currentFrame[Fields.valueStack].pop()
                if (!value) {
                    ptr = pos
                }
            }
                break
            case OpCode.EnterFunction: {
                // TODO: arguments and this/self reference
                const functionType = currentFrame[Fields.valueStack].pop()
                const variableCount: number = currentFrame[Fields.valueStack].pop()
                const variables: VariableRecord[] = []
                for (let i = 0; i < variableCount; i++) {
                    variables.push({
                        [Fields.type]: currentFrame[Fields.valueStack].pop(),
                        [Fields.name]: currentFrame[Fields.valueStack].pop()
                    })
                }
                const argumentNameCount: number = currentFrame[Fields.valueStack].pop()
                const argumentNames: string[] = []
                for (let i = 0; i < argumentNameCount; i++) {
                    argumentNames.push(currentFrame[Fields.valueStack].pop())
                }
                const parameterCount: number = currentFrame[Fields.valueStack].pop()
                const parameters: any[] = []
                for (let i = 0; i < parameterCount; i++) {
                    parameters.unshift(currentFrame[Fields.valueStack].pop())
                }

                // TODO: arguments and this/self reference
                const self = currentFrame[Fields.valueStack].pop()

                const scope: Scope = {}
                currentFrame[Fields.scopes].push(scope)

                for (let v of variables) {
                    defineVariable(scope, v[Fields.name], v[Fields.type])
                }

                for (let [index, name] of argumentNames.entries()) {
                    scope[name] = parameters[index]
                }
            }
                break
            case OpCode.EnterScope: {
                const variableCount: number = currentFrame[Fields.valueStack].pop()
                const variables: VariableRecord[] = []
                for (let i = 0; i < variableCount; i++) {
                    variables.push({
                        [Fields.type]: currentFrame[Fields.valueStack].pop(),
                        [Fields.name]: currentFrame[Fields.valueStack].pop()
                    })
                }

                const scope: Scope = {}
                currentFrame[Fields.scopes].push(scope)

                for (let v of variables) {
                    defineVariable(scope, v[Fields.name], v[Fields.type])
                }
            }
                break
            case OpCode.LeaveScope: {
                currentFrame[Fields.scopes].pop()
            }
                break
            case OpCode.DeTDZ: {
                const env: Frame = peak(currentFrame[Fields.valueStack], 2)
                const name = peak(currentFrame[Fields.valueStack])
                getVariableDescriptor(peak(env[Fields.scopes]), name)![Fields.tdz] = false
            }
                break
            case OpCode.FreezeVariable: {
                const env: Frame = peak(currentFrame[Fields.valueStack], 2)
                const name = peak(currentFrame[Fields.valueStack])
                getVariableDescriptor(peak(env[Fields.scopes]), name)![Fields.immutable] = true
            }
                break
            case OpCode.DefineFunction: {
                const type = currentFrame[Fields.valueStack].pop()
                const offset = currentFrame[Fields.valueStack].pop()
                const name = currentFrame[Fields.valueStack].pop()
                currentFrame[Fields.valueStack].push(defineFunction(currentFrame[Fields.scopes], name, type, offset))
            }
                break
            case OpCode.Call: {
                const parameterCount: number = currentFrame[Fields.valueStack].pop()
                const parameters: any[] = []
                for (let i = 0; i < parameterCount; i++) {
                    parameters.unshift(currentFrame[Fields.valueStack].pop())
                }

                const name = currentFrame[Fields.valueStack].pop()
                const envOrRecord = currentFrame[Fields.valueStack].pop()

                let fn = getValue(envOrRecord, name)

                let self = undefined

                if (!environments.has(envOrRecord)) {
                    self = envOrRecord
                }

                if (!functionDescriptors.has(fn)) {
                    // extern
                    currentFrame[Fields.valueStack].push(Reflect.apply(fn, self, parameters))
                } else {
                    const des = functionDescriptors.get(fn)!
                    const newFrame: Frame = {
                        [Fields.type]: FrameType.Function,
                        [Fields.scopes]: [...des.scopes],
                        [Fields.return]: ptr,
                        [Fields.valueStack]: [
                            self,
                            ...parameters,
                            parameters.length
                        ]
                    }
                    environments.add(newFrame)
                    
                    stack.push(newFrame)
                    ptr = des.offset
                }
            }
                break
            case OpCode.Return: {
                const result = currentFrame[Fields.valueStack].pop()
                if (currentFrame[Fields.valueStack].length > 0) {
                    throw new Error('bad return')
                }

                // remove all try frames
                while (peak(stack)[Fields.type] !== FrameType.Function) {
                    stack.pop()
                }
                
                const returnAddr = (peak(stack) as FunctionFrame)[Fields.return]

                if (returnAddr < 0) {
                    // leave the whole function
                    return result
                }

                stack.pop()

                peak(stack)[Fields.valueStack].push(result)
                ptr = returnAddr
            }
                break
            case OpCode.ReturnBare: {
                if (currentFrame[Fields.valueStack].length > 0) {
                    throw new Error('bad return')
                }

                // remove all try frames
                while (peak(stack)[Fields.type] !== FrameType.Function) {
                    stack.pop()
                }
                
                const returnAddr = (peak(stack) as FunctionFrame)[Fields.return]

                if (returnAddr < 0) {
                    // leave the whole function
                    return undefined
                }

                stack.pop()

                peak(stack)[Fields.valueStack].push(undefined)
                ptr = returnAddr
            }
                break
            case OpCode.NodeFunctionType:
            case OpCode.NodeOffset:
            case OpCode.Nop:
                break
            default:
                const nothing: never = command
                throw new Error('Unknown Op')
        }
    }
}