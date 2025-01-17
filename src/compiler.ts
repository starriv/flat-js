import * as ts from 'typescript'

export const TEXT_DADA_MASK = 0x80000000
export const isSmallNumber = (a: any): a is number => {
    return typeof a === 'number' && ((a | 0) === a) && ((a & TEXT_DADA_MASK) === 0)
}

export const enum SpecialVariable {
    This = '[this]',
    SwitchValue = '[switch]',
    LoopIterator = '[iter]',
    IteratorEntry = '[entry]'
}

export const enum StatementFlag {
    Try              = 1 << 0,
    Catch            = 1 << 1,
    Finally          = 1 << 2,
    TryCatchFlags = Try | Catch | Finally
}

export const enum TryCatchFinallyState {
    Try,
    Catch,
    Finally
}
export const enum ResultType {
    Normal,
    Return,
    Throw
}

export const enum VariableType {
    Var = 1,
    Let = 2,
    Const = 3,
    Parameter = 4,
    Function = 5,
}

export const enum SetFlag {
    DeTDZ = 1,
    Freeze = 2
}

export const enum InvokeType {
    Apply,
    Construct
}

type VariableDeclaration = {
    type: Exclude<VariableType, VariableType.Function>
} | {
    type: VariableType.Function
    node: ts.Node
}

type VariableRoot = ts.SourceFile |
    ts.FunctionDeclaration |
    ts.FunctionExpression |
    ts.MethodDeclaration |
    ts.ConstructorDeclaration |
    ts.AccessorDeclaration |
    ts.ArrowFunction

type ParentMap = Map<ts.Node, { key: string, node: ts.Node }>
type Scopes = Map<ts.Node, Map<string, VariableDeclaration>>
type ScopeChild = Map<ts.Node, Set<ts.Node>>
type Functions = Set<VariableRoot>

const abort = (msg: string): never => {
    throw new Error(msg)
}

export const enum OpCode {
    Nop,
    Literal,
    // StringLiteral = 2,
    // NumberLiteral = 3,
    // BooleanLiteral = 4,
    NullLiteral,
    UndefinedLiteral,

    NodeOffset,
    NodeFunctionType,
    /**
     * ```txt
     * Stack:
     *   offset
     *   condition
     * ```
     */
    JumpIfNot,
    /**
     * ```txt
     * Stack:
     *   offset
     *   condition
     * ```
     */
    JumpIf,
    Jump,

    /**
     * ```txt
     * Stack:
     *   offset
     *   condition
     * Result
     *   condition
     * ```
     */
    JumpIfAndKeep,
    /**
     * ```txt
     * Stack:
     *   offset
     *   condition
     * Result
     *   condition
     * ```
     */
    JumpIfNotAndKeep,

    // setup arguments, this, and so on
    /** 
     * ```txt
     * Stack:
     *   this
     *   function
     *   function name
     *   InvokeType.Apply
     *   parameter * O
     *   parameter count: O
     *   parameter name * N - reversed
     *   parameter name count: N
     *   [
     *     variable name
     *     variable type
     *   ] * M
     *   variable count: M
     *   function type
     * 
     * or
     *
     * Stack:
     *   newTarget
     *   constructor
     *   constructor name
     *   InvokeType.Construct
     *   parameter * O
     *   parameter count: O
     *   parameter name * N - reversed
     *   parameter name count: N
     *   [
     *     variable name
     *     variable type
     *   ] * M
     *   variable count: M
     *   function type
     * 
     * ```
    */
    EnterFunction,

    // only variable, like `{ let a = 1 }`
    /**
     * ```txt
     * Stack:
     *   [
     *     variable name
     *     variable type
     *   ] * M
     *   variable count: M
     * ```
    */
    EnterScope,
    LeaveScope,

    // stack ops
    Pop,

    /**
     * ```txt
     * Stack:
     *   item
     * Result:
     *   item
     *   item
     */
    Duplicate,

    // variable related
    /** RTL, foo = bar, var foo = bar */
    GetRecord,
    /**
     * ```txt
     * Stack:
     *   env or object
     *   name
     *   value
     * Result:
     *   value
     * ```
     */
    Set,
    /**
     * ```txt
     * Stack:
     *   env or object
     *   name
     *   value
     * Result:
     *   env or object
     * ```
     */
    SetKeepCtx,
    /**
     * ```txt
     * Stack:
     *   [
     *     name
     *     value
     *     setFlag
     *   ] * M
     *   itemCount - M
     *   env or object
     * Result:
     *   env or object
     * ```
     */
    SetMultiple,
    /**
     * ```txt
     * Stack:
     *   object
     *   name
     *   value
     * Result:
     *   env or object
     * ```
     */
    DefineKeepCtx,
    /**
     * ```txt
     * Stack:
     *   env or object
     *   name
     * ```
    */
    Get,
    /**
     * ```txt
     * Stack:
     *   env or object // no consume
     *   name // no consume
     * ```
    */
    DeTDZ,
    /**
     * ```txt
     * Stack:
     *   env or object // no consume
     *   name // no consume
     * ```
    */
    FreezeVariable,

    /**
     * ```tst
     * Stack:
     *   name
     *   nodeOffset
     *   nodeFunctionType
     * ```
     */
    DefineFunction,
    Return,

    /**
     * ```tst
     * Stack:
     *   TryCatchFinallyState
     *   ReturnType
     *   Value
     * ```
     */
    ReturnInTryCatchFinally,

    /**
     * ```tst
     * Stack:
     *   Value
     * ```
     */
    Throw,

    /**
     * ```tst
     * Stack:
     *   TryCatchFinallyState
     *   ReturnType
     *   Value
     * ```
     */
    ThrowInTryCatchFinally,

    /**
     * ```tst
     * Stack:
     *   TryCatchFinallyState
     *   ReturnType
     *   Value
     * ```
     */
    ExitTryCatchFinally,


    /**
     * ```tst
     * Stack:
     *   Exit
     *   CatchAddress
     *   FinallyAddress
     *   CatchClauseName
     * ```
     */
    InitTryCatch,

    /**
     * ```txt
     * Stack:
     *   env or object
     *   name
     *   argument * M
     *   argument count - M
     * ```
     */
    Call,

    /**
     * ```txt
     * Stack:
     *   fn
     *   argument * M
     *   argument count - M
     * ```
     */
    New,

    /**
     * ```txt
     * Stack:
     *   fn
     *   argument * M
     *   argument count - M
     * ```
     */
    CallValue,

    /**
     * ```txt
     * Stack:
     *   value
     * ```
     */
    Typeof,

    /**
     * ```txt
     * Stack:
     *   env or object
     *   name
     * ```
     */
    TypeofReference,

    /**
     * ```txt
     * Stack:
     *   value left
     *   value right
     * ```
     */
    InstanceOf,

    /**
     * ```txt
     * Stack:
     *   value
     * Result:
     *   iterator
     * ```
     */
    GetPropertyIterator,

    /**
     * ```txt
     * Stack:
     *   iterator
     * Result:
     *   entry
     * ```
     */
    NextEntry,

    /**
     * ```txt
     * Stack:
     *   iterator entry
     * Result:
     *   boolean - done
     * ```
     */
    EntryIsDone,

    /**
     * ```txt
     * Stack:
     *   iterator entry
     * Result:
     *   value
     * ```
     */
    EntryGetValue,

    /**
     * ```txt
     * Stack:
     * ```
     */
    ArrayLiteral,
    /**
     * ```txt
     * Stack:
     * ```
     */
    ObjectLiteral,

    /**
     * ```txt
     * Stack:
     *   Source
     *   Flags
     * ```
     */
    RegexpLiteral,

    // Binary Operations
    /** in */
    BIn,
    /** + */
    BPlus,
    /** - */
    BMinus,
    /** ^ */
    BCaret,
    /** & */
    BAmpersand,
    /** | */
    BBar,
    /** > */
    BGreaterThan,
    /** >> */
    BGreaterThanGreaterThan,
    /** >>> */
    BGreaterThanGreaterThanGreaterThan,
    /** >= */
    BGreaterThanEquals,
    /** < */
    BLessThan,
    /** << */
    BLessThanLessThan,
    /** <= */
    BLessThanEquals,
    /** == */
    BEqualsEquals,
    /** === */
    BEqualsEqualsEquals,
    /** != */
    BExclamationEquals,
    /** !== */
    BExclamationEqualsEquals,
    /** * */
    BAsterisk,
    /** / */
    BSlash,
    /** % */
    BPercent,

    // assign and update
    /** += */
    BPlusEqual,
    /** -= */
    BMinusEqual,
    /** /= */
    BSlashEqual,
    /** *= */
    BAsteriskEqual,

    /**
     * Stack:
     *   env or object
     *   name
     */
    Delete,
    /** 
     * ```txt
     * a--
     * Stack:
     *   env or object
     *   name
     * ```
     * 
    */

    // Errors
    /** 
     * ```txt
     * Stack:
     *   message
     * ```
     * 
    */
    ThrowReferenceError,

    PostFixMinusMinus,
    /**
     * ```txt
     * a++
     * Stack:
     *   env or object
     *   name
     * ```
     */
    PostFixPlusPLus,
    PrefixUnaryPlus,
    PrefixUnaryMinus,
    PrefixExclamation,
    PrefixTilde,

    PrefixPlusPlus,
    PrefixMinusMinus,

    /**
     * debugger;
     */
    Debugger,
}


export const enum ResolveType {
    normal,
    throw,
    return
}

export const enum FunctionTypes {
    SourceFile,
    FunctionDeclaration,
    FunctionExpression,
    ArrowFunction,
    MethodDeclaration,
    GetAccessor,
    SetAccessor,
    Constructor
}

type Op<Code extends OpCode = OpCode> = {
    op: Code
    /** A length of 0 prevent emit of opcode itself */
    length: number
    preData: any[]
    data: number[]
    offset: number,
    source?: { start: number, end: number }
}

type Segment = Op[]

function findAncient(node: ts.Node, parentMap: ParentMap, predicate: (node: ts.Node) => boolean): ts.Node | undefined
function findAncient<T extends ts.Node = ts.Node>(node: ts.Node, parentMap: ParentMap, predicate: (node: ts.Node) => node is T): T | undefined
function findAncient(node: ts.Node, parentMap: ParentMap, predicate: (node: ts.Node) => boolean): ts.Node | undefined {
    let parent: ts.Node | undefined = parentMap.get(node)?.node
    while (parent !== undefined) {
        if (predicate(parent)) {
            return parent
        }

        parent = parentMap.get(parent)?.node
    }
}

function markParent(node: ts.Node, parentMap: ParentMap) {
    function findFunction(node: ts.Node) {
        for (let [key, v] of Object.entries(node)) {
            if (Array.isArray(v)) {
                for (let item of v) {
                    if (item !== null && typeof item === 'object' && typeof item.kind == 'number') {
                        parentMap.set(item, { key, node })
                    }
                }
            } else if (v !== null && typeof v === 'object' && typeof v.kind == 'number') {
                parentMap.set(v, { key, node })
            }
        }
        node.forEachChild(findFunction)
    }
    findFunction(node)
}


function isScopeRoot(node: ts.Node): node is VariableRoot {
    return ts.isSourceFile(node) ||
        (
            ts.isFunctionLike(node)
            && !ts.isCallSignatureDeclaration(node)
            && !ts.isConstructSignatureDeclaration(node)
            && !ts.isMethodSignature(node)
            && !ts.isIndexSignatureDeclaration(node)
            && !ts.isTypeNode(node)
        )
}

function extractVariable(node: ts.Identifier | ts.ObjectBindingPattern | ts.ArrayBindingPattern | ts.Node): ts.Identifier[] {
    if (ts.isIdentifier(node)) {
        return [node]
    }

    if (ts.isArrayBindingPattern(node)) {
        const n = node
        let list: ts.Identifier[] = []
        for (const el of n.elements) {
            if (ts.isIdentifier(el)) {
                list.push(el)
            }
            if (ts.isObjectBindingPattern(el) || ts.isArrayBindingPattern(el)) {
                list = [...list, ...extractVariable(el)]
            }
        }

        return list
    }

    if (ts.isObjectBindingPattern(node)) {
        const n = node
        let list: ts.Identifier[] = []
        for (const el of n.elements) {
            // includes { ...a }
            if (ts.isIdentifier(el.name)) {
                if (el.propertyName === undefined) {
                    list.push(el.name)
                }
            }

            if (el.propertyName) {
                if (ts.isIdentifier(el.name)) {
                    list.push(el.name)
                }

                if (ts.isObjectBindingPattern(el.name) || ts.isArrayBindingPattern(el.name)) {
                    list = [...list, ...extractVariable(el.name)]
                }
            }
        }

        return list
    }

    return []
}

function searchFunctionAndScope(node: ts.Node, parentMap: ParentMap, functions: Functions, scopes: Scopes) {
    function findFunction(node: ts.Node) {
        if (isScopeRoot(node)) {
            functions.add(node)
            scopes.set(node, new Map())
        }

        switch (node.kind) {
            case ts.SyntaxKind.Block:
                let pair = parentMap.get(node)
                if (
                    pair
                    && pair.key === 'body'
                    && (
                        ts.isConstructorDeclaration(pair.node) ||
                        ts.isFunctionDeclaration(pair.node) ||
                        ts.isFunctionExpression(pair.node) ||
                        ts.isArrowFunction(pair.node) ||
                        ts.isMethodDeclaration(pair.node) ||
                        ts.isAccessor(pair.node)
                    )
                ) {
                    break // this is the body of function, method, constructor
                }
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:

            case ts.SyntaxKind.SwitchStatement:
            case ts.SyntaxKind.CaseBlock:
                scopes.set(node, new Map())
        }
        node.forEachChild(findFunction)
    }
    findFunction(node)
}

function resolveScopes(node: ts.Node, parentMap: ParentMap, functions: Functions, scopes: Scopes) {
    function findFunction(node: ts.Node) {
        if (ts.isVariableDeclarationList(node)) {
            const variables = node.declarations.map(d => extractVariable(d.name)).flat()
            const blockScoped = node.flags & ts.NodeFlags.BlockScoped

            let block

            if (blockScoped) {
                block = findAncient(node, parentMap, node => scopes.has(node))
            } else {
                block = findAncient(node, parentMap, node => functions.has(node as any))
            }

            if (block === undefined) {
                throw new Error('unresolvable variable')
            }

            for (const v of variables) {
                scopes.get(block)!.set(
                    v.text,
                    {
                        type: node.flags & ts.NodeFlags.Const ? VariableType.Const :
                            node.flags & ts.NodeFlags.Let ? VariableType.Let :
                                VariableType.Var
                    }
                )
            }
        }

        if (ts.isForInStatement(node)) {
            scopes.get(node)!.set(SpecialVariable.LoopIterator, {
                type: VariableType.Var
            })

            scopes.get(node)!.set(SpecialVariable.IteratorEntry, {
                type: VariableType.Var
            })
        }

        if (ts.isFunctionDeclaration(node)) {
            const parentFn = findAncient(node, parentMap, node => (functions as Set<ts.Node>).has(node))

            if (parentFn === undefined) {
                throw new Error('unresolvable variable')
            }

            scopes.get(parentFn)!.set(node.name!.text, {
                type: VariableType.Function,
                node: node
            })
        }

        if (ts.isFunctionLike(node)) {
            for (const el of node.parameters) {
                const variables = extractVariable(el.name)
                const scope = scopes.get(node)

                if (scope === undefined) {
                    throw new Error('unresolvable variable')
                }
                for (const v of variables) {
                    scope.set(
                        v.text,
                        {
                            type: VariableType.Parameter
                        }
                    )
                }
            }
        }

        node.forEachChild(findFunction)
    }
    findFunction(node)
}

function linkScopes(node: ts.Node, parentMap: ParentMap, scopes: Scopes, scopeChild: ScopeChild) {
    function findFunction(node: ts.Node) {
        const item = scopes.get(node)

        if (item && item.size > 0) {
            const parent = findAncient(node, parentMap, node => (scopes.get(node)?.size ?? 0) > 0)
            if (parent) {
                scopeChild.set(parent, new Set([node, ...(scopeChild.get(parent) ?? new Set())]))
            }
        }

        node.forEachChild(findFunction)
    }
    findFunction(node)
}

/* istanbul ignore next */
const mapVariables = (scopes: Scopes, scopeChild: ScopeChild) => {
    const hasParent: Set<ts.Node> = new Set()
    for (let v of scopeChild.values()) {
        for (let v1 of v)
            hasParent.add(v1)
    }

    const roots: Set<ts.Node> = new Set()

    for (let k of scopeChild.keys()) {
        if (!hasParent.has(k)) {
            roots.add(k)
        }
    }

    interface Res {
        names: string[]
        children: Res[]
    }

    function map(node: ts.Node): Res {
        const scope = scopes.get(node)!
        const names = [...scope.entries()].map(([k, v]) => k + ':' + v.type)

        const children: Res[] = []

        if (scopeChild.has(node)) {
            for (const node1 of scopeChild.get(node)!) {
                children.push(map(node1))
            }
        }

        return {
            names,
            children
        }
    }

    return [...roots].map(map)
}


function headOf<T>(arr: T[]): T {
    if (arr.length === 0) {
        throw new Error('empty array')
    }
    return arr[0]!
}

export function getNameOfKind(kind: ts.SyntaxKind): string {
    let name = ts.SyntaxKind[kind]

    if (name.match(/^First|^Last/)) {
        for (let [k, v] of Object.entries(ts.SyntaxKind)) {
            if (v === kind && k !== name) {
                return k
            }
        }
    }

    return name
}

function op(op: OpCode, length: number = 1, preData: any[] = []): Op<OpCode> {
    return {
        op,
        length,
        preData,
        data: [],
        offset: -1
    }
}

function generateVariableList(node: ts.Node, scopes: Scopes): Op[] {
    const variables = scopes.get(node)!

    return [...variables].map(([name, type]) => [
        op(OpCode.Literal, 2, [name]),
        op(OpCode.Literal, 2, [type.type])
    ]).flat().concat([
        op(OpCode.Literal, 2, [variables.size])
    ])
}

function generateEnterScope(node: ts.Node, scopes: Scopes): Op<OpCode>[] {
    const result = [
        ...generateVariableList(node, scopes),
        op(OpCode.EnterScope)
    ]

    if (result.length <= 2) {
        throw new Error('tries to generate empty block')
    }

    return result
}

function generateLeaveScope(node: ts.Node): Op<OpCode>[] {
    return [
        op(OpCode.LeaveScope)
    ]
}

const nextOps = new Map<ts.Node, Op>()
const continueOps = new Map<ts.Node, Op>()

function generateSegment(node: VariableRoot, scopes: Scopes, parentMap: ParentMap, functions: Functions, withPos = false): Segment {
    let functionDeclarations: ts.FunctionDeclaration[] = []

    function extractQuote(node: ts.Node) {
        if (ts.isParenthesizedExpression(node)) {
            return node.expression
        } else {
            return node
        }
    }
    function generateLeft(node: ts.Node, flag: number): Segment {
        const res = generateLeft_(node, flag)

        if (withPos) {
            for (const op of res) {
                if (
                    op.source == null
                    ||op.source.end - op.source.start > node.end - node.pos
                ) {
                    op.source = {
                        start: node.pos,
                        end: node.end
                    }
                }
            }
        }

        return res
    }
    function generateLeft_(node: ts.Node, flag: number): Segment {
        const rawNode = extractQuote(node)

        if (rawNode.kind === ts.SyntaxKind.ThisKeyword) {
            return [
                op(OpCode.GetRecord),
                op(OpCode.Literal, 2, [SpecialVariable.This])
            ]
        }

        if (ts.isIdentifier(rawNode)) {
            return [
                op(OpCode.GetRecord),
                op(OpCode.Literal, 2, [rawNode.text])
            ]
        }

        if (ts.isPropertyAccessExpression(rawNode) && ts.isIdentifier(rawNode.name)) {
            return [
                ...generate(rawNode.expression, flag),
                op(OpCode.Literal, 2, [rawNode.name.text])
            ]
        }

        if (ts.isElementAccessExpression(rawNode)) {
            return [
                ...generate(rawNode.expression, flag),
                ...generate(rawNode.argumentExpression, flag)
            ]
        }

        throw new Error('not supported left node: ' + getNameOfKind(rawNode.kind))
    }
    function generate(node: ts.Node, flag: number): Segment {
        const res = generate_(node, flag)

        if (withPos) {
            for (const op of res) {
                if (
                    op.source == null
                    ||op.source.end - op.source.start > node.end - node.pos
                ) {
                    op.source = {
                        start: node.pos,
                        end: node.end
                    }
                }
            }
        }

        return res
    }
    function generate_(node: ts.Node, flag: number): Segment {
        switch (node.kind) {
            case ts.SyntaxKind.TrueKeyword:
                return [op(OpCode.Literal, 2, [true])]
            case ts.SyntaxKind.FalseKeyword:
                return [op(OpCode.Literal, 2, [false])]
            case ts.SyntaxKind.NullKeyword:
                return [op(OpCode.NullLiteral)]
            case ts.SyntaxKind.EmptyStatement:
                return [op(OpCode.Nop, 0)]
            case ts.SyntaxKind.ThisKeyword:
                return [
                    op(OpCode.GetRecord),
                    op(OpCode.Literal, 2, [SpecialVariable.This]),
                    op(OpCode.Get)
                ]
        }

        if (ts.isIdentifier(node) && node.text === 'undefined') {
            return [op(OpCode.UndefinedLiteral)]
        }

        if (ts.isVariableDeclarationList(node)) {
            const ops: Segment = []

            for (let declaration of node.declarations) {
                if (!ts.isIdentifier(declaration.name)) {
                    throw new Error('not support pattern yet')
                }

                if (declaration.initializer) {
                    ops.push(...generateLeft(declaration.name, flag))

                    if (node.flags & ts.NodeFlags.BlockScoped) {
                        ops.push(op(OpCode.DeTDZ))
                    }

                    ops.push(...generate(declaration.initializer, flag))

                    ops.push(op(OpCode.Set))
                    ops.push(op(OpCode.Pop))
                    if (node.flags & ts.NodeFlags.Const) {
                        ops.push(
                            ...generateLeft(declaration.name, flag),
                            op(OpCode.FreezeVariable),
                            op(OpCode.Pop),
                            op(OpCode.Pop)
                        )
                    }
                } else if (node.flags & ts.NodeFlags.Let) {
                    // unblock without doing anything
                    ops.push(
                        ...generateLeft(declaration.name, flag),
                        op(OpCode.DeTDZ),
                        op(OpCode.Pop),
                        op(OpCode.Pop)
                    )
                } else {
                    // a var without value effectively does nothing
                    // the variable already handled by the scope step
                }
            }

            return ops
        }

        if (ts.isVariableStatement(node)) {
            return generate(node.declarationList, flag)
        }

        if (ts.isStringLiteral(node)) {
            return [op(OpCode.Literal, 2, [node.text])]
        }

        if (ts.isExpressionStatement(node)) {
            return [
                ...generate(node.expression, flag),
                op(OpCode.Pop)
            ]
        }

        if (ts.isNumericLiteral(node)) {
            return [op(OpCode.Literal, 2, [Number(node.text)])]
        }

        if (
            ts.isArrowFunction(node)
        ) {
            return [
                op(OpCode.Literal, 2, ['']), // TODO: Fix it
                op(OpCode.NodeOffset, 2, [node]),
                op(OpCode.NodeFunctionType, 2, [node]),
                op(OpCode.DefineFunction)
            ]
        }

        if (
            ts.isConditionalExpression(node)
        ) {
            const condition = generate(node.condition, flag)
            const positive = [op(OpCode.Nop, 0), ...generate(node.whenTrue, flag)]
            const negative = [op(OpCode.Nop, 0), ...generate(node.whenFalse, flag)]
            const end = [op(OpCode.Nop, 0)]

            return [
                op(OpCode.NodeOffset, 2, [headOf(negative)]),
                ...condition,
                op(OpCode.JumpIfNot),

                ...positive,
                op(OpCode.NodeOffset, 2, [headOf(end)]),
                op(OpCode.Jump),

                ...negative,

                ...end
            ]
        }

        if (
            ts.isFunctionExpression(node)
        ) {
            return [
                op(OpCode.Literal, 2, [node.name?.text ?? '']),
                op(OpCode.NodeOffset, 2, [node]),
                op(OpCode.NodeFunctionType, 2, [node]),
                op(OpCode.DefineFunction)
            ]
        }

        // hoist it
        if (
            ts.isFunctionDeclaration(node)
        ) {
            functionDeclarations.push(node)
            return []
        }

        if (ts.isBlock(node)) {
            const variableCount = scopes.get(node)?.size ?? 0
            if (variableCount > 0) {
                return [
                    ...generateEnterScope(node, scopes),
                    ...node.statements.map(s => generate(s, flag)).flat(),
                    ...generateLeaveScope(node)
                ]
            } else {
                return [
                    op(OpCode.Nop, 0),
                    ...node.statements.map(s => generate(s, flag)).flat()
                ]
            }
        }

        if (ts.isIdentifier(node)) {
            return [
                op(OpCode.GetRecord),
                op(OpCode.Literal, 2, [node.text]),
                op(OpCode.Get)
            ]
        }
        if (ts.isReturnStatement(node)) {
            if (node.expression !== undefined) {
                return [
                    ...generate(node.expression, flag),
                    (flag & StatementFlag.TryCatchFlags) ? op(OpCode.ReturnInTryCatchFinally) : op(OpCode.Return)
                ]
            } else {
                return [
                    op(OpCode.UndefinedLiteral),
                    (flag & StatementFlag.TryCatchFlags) ? op(OpCode.ReturnInTryCatchFinally) : op(OpCode.Return)
                ]
            }
        }

        if (ts.isPrefixUnaryExpression(node)) {
            if (ts.isNumericLiteral(node.operand)) {
                if (node.operator === ts.SyntaxKind.MinusToken) {
                    return [
                        op(OpCode.Literal, 2, [-Number(node.operand.text)]),
                    ]
                } else if (node.operator === ts.SyntaxKind.PlusToken) {
                    return [
                        op(OpCode.Literal, 2, [+Number(node.operand.text)]),
                    ]
                }
            }

            // Prefix update
            switch (node.operator) {
                case ts.SyntaxKind.PlusPlusToken:
                    return [
                        ...generateLeft(node.operand, flag),
                        op(OpCode.PrefixPlusPlus)
                    ]
                case ts.SyntaxKind.MinusMinusToken:
                    return [
                        ...generateLeft(node.operand, flag),
                        op(OpCode.PrefixMinusMinus)
                    ]
                default:
                    const nothing = node.operator
            }

            // Unary
            const expr = generate(node.operand, flag)
            switch (node.operator) {
                case ts.SyntaxKind.PlusToken:
                    return [...expr, op(OpCode.PrefixUnaryPlus)]
                case ts.SyntaxKind.MinusToken:
                    return [...expr, op(OpCode.PrefixUnaryMinus)]
                case ts.SyntaxKind.ExclamationToken:
                    return [...expr, op(OpCode.PrefixExclamation)]
                case ts.SyntaxKind.TildeToken:
                    return [...expr, op(OpCode.PrefixTilde)]
                default:
                    throw new Error('unsupported operator ' + ts.SyntaxKind[node.operator])
            }
        }

        if (ts.isCallExpression(node)) {
            const self = extractQuote(node.expression)
            const args = node.arguments.map(a => generate(a, flag)).flat()

            if (ts.isElementAccessExpression(self) || ts.isPropertyAccessExpression(self) || ts.isIdentifier(self)) {
                const leftOps = generateLeft(self, flag)

                return [
                    ...leftOps,
                    ...args,
                    op(OpCode.Literal, 2, [node.arguments.length]),
                    op(OpCode.Call)
                ]
            } else {
                const leftValue = generate(self, flag)

                return [
                    ...leftValue,
                    ...args,
                    op(OpCode.Literal, 2, [node.arguments.length]),
                    op(OpCode.CallValue)
                ]
            }
        }

        if (ts.isNewExpression(node)) {
            const self = extractQuote(node.expression)
            const args = node.arguments?.map(a => generate(a, flag)).flat() ?? []

            const leftValue = generate(self, flag)

            return [
                ...leftValue,
                ...args,
                op(OpCode.Literal, 2, [node.arguments?.length ?? 0]),
                op(OpCode.New)
            ]
        }

        if (ts.isArrayLiteralExpression(node)) {
            const res = [
                op(OpCode.ArrayLiteral)
            ]
            const list = node.elements
            for (let [index, el] of list.entries()) {
                if (ts.isSpreadElement(el)) {
                    throw new Error('no spread support yet')
                }

                if (el.kind !== ts.SyntaxKind.OmittedExpression) {
                    res.push(op(OpCode.Literal, 2, [index]))
                    res.push(...generate(el, flag))
                    res.push(op(OpCode.SetKeepCtx))
                }
            }

            return res
        }

        if (ts.isObjectLiteralExpression(node)) {
            const res = [
                op(OpCode.ObjectLiteral)
            ]
            const list = node.properties

            for (let item of list) {
                if (ts.isShorthandPropertyAssignment(item)) {
                    res.push(op(OpCode.Literal, 2, [item.name.text]))
                    res.push(...generate(item.name, flag))
                    res.push(op(OpCode.DefineKeepCtx))
                } else {
                    if (!item.name) {
                        throw new Error('property must have name')
                    }

                    if (ts.isComputedPropertyName(item.name)) {
                        res.push(...generate(item.name.expression, flag))
                    } else if (ts.isIdentifier(item.name)) {
                        res.push(op(OpCode.Literal, 2, [item.name.text]))
                    } else if (
                        ts.isStringLiteral(item.name)
                        || ts.isNumericLiteral(item.name)
                    ) {
                        res.push(...generate(item.name, flag))
                    } else {
                        throw new Error('not supported')
                    }

                    if (ts.isMethodDeclaration(item)) {
                        res.push(op(OpCode.Duplicate))
                        res.push(op(OpCode.NodeOffset, 2, [item]))
                        res.push(op(OpCode.NodeFunctionType, 2, [item]))
                        res.push(op(OpCode.DefineFunction))
                        res.push(op(OpCode.DefineKeepCtx))
                    } else if (ts.isPropertyAssignment(item)) {
                        res.push(...generate(item.initializer, flag))
                        res.push(op(OpCode.DefineKeepCtx))
                    } else {
                        throw new Error('not supported')
                    }
                }
            }

            return res
        }

        if (ts.isRegularExpressionLiteral(node)) {
            const source = node.text.replace(/^\/(.*)\/(\w*)$/, '$1')
            const flags = node.text.replace(/^\/(.*)\/(\w*)$/, '$2')
            return [
                op(OpCode.Literal, 2, [source]),
                op(OpCode.Literal, 2, [flags]),
                op(OpCode.RegexpLiteral)
            ]
        }

        if (ts.isForStatement(node)) {
            const nextOp = op(OpCode.Nop, 0)
            nextOps.set(node, nextOp)

            const continueOp = op(OpCode.Nop, 0)
            continueOps.set(node, continueOp)

            let initializer = node.initializer
            let condition = node.condition
            let incrementor = node.incrementor

            let hasScope = scopes.has(node) && scopes.get(node)!.size > 0


            /**
             *    entry
             * |- condition <-
             * |  body       |
             * |  update ----|
             * -> exit
             */

            var entry0 = hasScope
                ? generateEnterScope(node, scopes)
                : [op(OpCode.Nop, 0)]

            var entry1 = initializer
                ?  ts.isVariableDeclarationList(initializer)
                    ? generate(initializer, flag)
                    : [
                        ...generate(initializer, flag),
                        op(OpCode.Pop)
                    ]
                : [op(OpCode.Nop, 0)]

            var exit = hasScope
                ? [op(OpCode.LeaveScope)]
                : [op(OpCode.Nop, 0)]

            var conditionS = condition
                ? [
                    op(OpCode.NodeOffset, 2, [headOf(exit)]),
                    ...generate(condition, flag),
                    op(OpCode.JumpIfNot)
                ]
                : [
                    op(OpCode.Nop, 0)
                ]

            var update0 = []

            if (hasScope && ts.isVariableDeclarationList(initializer!)) {
                for (let item of initializer.declarations) {
                    if (!ts.isIdentifier(item.name)) {
                        throw new Error('not support')
                    }

                    update0.push(
                        op(OpCode.Literal, 2, [item.name.text]),
                        op(OpCode.GetRecord),
                        op(OpCode.Literal, 2, [item.name.text]),
                        op(OpCode.Get),
                        op(OpCode.Literal, 2, [SetFlag.DeTDZ | ((initializer.flags & ts.NodeFlags.Const) ? SetFlag.Freeze : 0)])
                    )
                }

                update0.push(
                    op(OpCode.Literal, 2, [initializer.declarations.length]),
                    op(OpCode.LeaveScope),
                    ...generateEnterScope(node, scopes),
                    op(OpCode.GetRecord),
                    op(OpCode.SetMultiple)
                )

                for (let item of initializer.declarations) {
                    if (!ts.isIdentifier(item.name)) {
                        throw new Error('not support')
                    }
                }
            }

            var update1 = incrementor
                ? [
                    ...generate(incrementor, flag),
                    op(OpCode.Pop),
                    op(OpCode.NodeOffset, 2, [headOf(conditionS)]),
                    op(OpCode.Jump)
                ]
                : [
                    op(OpCode.NodeOffset, 2, [headOf(conditionS)]),
                    op(OpCode.Jump)
                ]

            var body = generate(node.statement, flag)

            return [
                ...entry0,
                ...entry1,
                ...conditionS,
                ...body,
                continueOp,
                ...update0,
                ...update1,
                ...exit,
                nextOp
            ]
        }

        if (ts.isIfStatement(node)) {
            /**
             * |--condition
             * |  whenTrue --|
             * -->whenFalsy  |
             *    exit     <-|
             */

            const exit = [
                op(OpCode.Nop, 0)
            ]

            const whenTrue = [
                op(OpCode.Nop, 0),
                ...generate(node.thenStatement, flag),
                op(OpCode.NodeOffset, 2, [headOf(exit)]),
                op(OpCode.Jump),
            ]

            const whenFalsy = [
                op(OpCode.Nop, 0),
                ...(node.elseStatement !== undefined ? generate(node.elseStatement, flag) : [])
            ]

            const condition = [
                op(OpCode.NodeOffset, 2, [headOf(whenFalsy)]),
                ...generate(node.expression, flag),
                op(OpCode.JumpIfNot)
            ]

            return [...condition, ...whenTrue, ...whenFalsy, ...exit]
        }

        // &&
        if (ts.isBinaryExpression(node)) {
            switch (node.operatorToken.kind) {
                case ts.SyntaxKind.AmpersandAmpersandToken:
                    const left = generate(node.left, flag)
                    const right = generate(node.right, flag)
                    const exit = [op(OpCode.Nop, 0)]
                    /**
                     *   push evaluate left
                     *   if not peak() goto Exit
                     *     pop
                     *     push evaluate right
                     *     goto Exit
                     *   Else:
                     *     push res
                     *   Exit:
                     */
                    return [
                        op(OpCode.NodeOffset, 2, [headOf(exit)]),
                        ...left,
                        op(OpCode.JumpIfNotAndKeep),

                        op(OpCode.Pop),
                        ...right,

                        ...exit
                    ]
                default:
                    // let next block do it
            }
        }

        // ||
        if (ts.isBinaryExpression(node)) {
            switch (node.operatorToken.kind) {
                case ts.SyntaxKind.BarBarToken:
                    const left = generate(node.left, flag)
                    const right = generate(node.right, flag)
                    const exit = [op(OpCode.Nop, 0)]
                    /**
                     *   push evaluate left
                     *   if peak() goto Exit
                     *     pop
                     *     push evaluate right
                     *     goto Exit
                     *   Else:
                     *     push res
                     *   Exit:
                     */
                    return [
                        op(OpCode.NodeOffset, 2, [headOf(exit)]),
                        ...left,
                        op(OpCode.JumpIfAndKeep),

                        op(OpCode.Pop),
                        ...right,

                        ...exit
                    ]
                default:
                    // let next block do it
            }
        }

        if (ts.isVoidExpression(node)) {
            return [
                ...generate(node.expression, flag),
                op(OpCode.Pop),
                op(OpCode.UndefinedLiteral)
            ]
        }


        // Comma
        if (ts.isBinaryExpression(node)) {
            switch (node.operatorToken.kind) {
                case ts.SyntaxKind.CommaToken:
                    return [
                        ...generate(node.left, flag),
                        op(OpCode.Pop),
                        ...generate(node.right, flag)
                    ]
                default:
                    // let next block do it
            }
        }

        // Assignments
        if (ts.isBinaryExpression(node)) {
            const kind = node.operatorToken.kind
            switch (kind) {
                case ts.SyntaxKind.PlusEqualsToken:
                case ts.SyntaxKind.MinusEqualsToken:
                case ts.SyntaxKind.SlashEqualsToken:
                case ts.SyntaxKind.AsteriskEqualsToken:
                case ts.SyntaxKind.EqualsToken:
                    const left = extractQuote(node.left)
                    if (
                        ts.isPropertyAccessExpression(left) ||
                        ts.isElementAccessExpression(left) ||
                        ts.isIdentifier(left) ||
                        left.kind === ts.SyntaxKind.ThisKeyword) {
                        return [
                            ...generateLeft(node.left, flag),
                            ...generate(node.right, flag),
                            op(
                                kind === ts.SyntaxKind.EqualsToken ? OpCode.Set:
                                kind === ts.SyntaxKind.PlusEqualsToken ? OpCode.BPlusEqual:
                                kind === ts.SyntaxKind.MinusEqualsToken ? OpCode.BMinusEqual: 
                                kind === ts.SyntaxKind.SlashEqualsToken ? OpCode.BSlashEqual:
                                kind === ts.SyntaxKind.AsteriskEqualsToken ? OpCode.BAsteriskEqual: 
                                abort('Why Am I here?')
                            )
                        ]
                    } else {        
                        return [
                            ...generate(left, flag),
                            op(OpCode.Literal, 2, ['Invalid left-hand side in assignment']),
                            op(OpCode.ThrowReferenceError)
                        ]
                    }
                default:
                    // let next block do it
            }
        }

        if (ts.isBinaryExpression(node)) {
            const ops = [
                ...generate(node.left, flag),
                ...generate(node.right, flag),
            ]

            switch (node.operatorToken.kind) {
                case ts.SyntaxKind.InstanceOfKeyword:
                    ops.push(op(OpCode.InstanceOf)); break;
                case ts.SyntaxKind.PlusToken:
                    ops.push(op(OpCode.BPlus)); break;
                case ts.SyntaxKind.MinusToken:
                    ops.push(op(OpCode.BMinus)); break;
                case ts.SyntaxKind.CaretToken:
                    ops.push(op(OpCode.BCaret)); break;
                case ts.SyntaxKind.AmpersandToken:
                    ops.push(op(OpCode.BAmpersand)); break;
                case ts.SyntaxKind.BarToken:
                    ops.push(op(OpCode.BBar)); break;
                case ts.SyntaxKind.GreaterThanToken:
                    ops.push(op(OpCode.BGreaterThan)); break;
                case ts.SyntaxKind.GreaterThanGreaterThanToken:
                    ops.push(op(OpCode.BGreaterThanGreaterThan)); break;
                case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                    ops.push(op(OpCode.BGreaterThanGreaterThanGreaterThan)); break;
                case ts.SyntaxKind.GreaterThanEqualsToken:
                    ops.push(op(OpCode.BGreaterThanEquals)); break;
                case ts.SyntaxKind.LessThanToken:
                    ops.push(op(OpCode.BLessThan)); break;
                case ts.SyntaxKind.LessThanLessThanToken:
                    ops.push(op(OpCode.BLessThanLessThan)); break;
                case ts.SyntaxKind.LessThanEqualsToken:
                    ops.push(op(OpCode.BLessThanEquals)); break;
                case ts.SyntaxKind.EqualsEqualsToken:
                    ops.push(op(OpCode.BEqualsEquals)); break;
                case ts.SyntaxKind.EqualsEqualsEqualsToken:
                    ops.push(op(OpCode.BEqualsEqualsEquals)); break;
                case ts.SyntaxKind.ExclamationEqualsToken:
                    ops.push(op(OpCode.BExclamationEquals)); break;
                case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                    ops.push(op(OpCode.BExclamationEqualsEquals)); break;
                case ts.SyntaxKind.InKeyword:
                    ops.push(op(OpCode.BIn)); break;
                case ts.SyntaxKind.AsteriskToken:
                    ops.push(op(OpCode.BAsterisk)); break;
                case ts.SyntaxKind.SlashToken:
                    ops.push(op(OpCode.BSlash)); break;
                case ts.SyntaxKind.PercentToken:
                    ops.push(op(OpCode.BPercent)); break;
                default:
                    const remain = node.operatorToken.kind
                    throw new Error('unknown token ' + getNameOfKind(remain))
            }

            return ops
        }

        if (ts.isTypeOfExpression(node)) {
            const unwrapped = extractQuote(node.expression)
            if (ts.isIdentifier(unwrapped)) {
                return [
                    op(OpCode.GetRecord),
                    op(OpCode.Literal, 2, [unwrapped.text]),
                    op(OpCode.TypeofReference)
                ]
            } else {
                return [
                    ...generate(node.expression, flag),
                    op(OpCode.Typeof)
                ]
            }
        }

        if (ts.isPostfixUnaryExpression(node)) {
            switch (node.operator) {
                case ts.SyntaxKind.PlusPlusToken:
                    return [
                        ...generateLeft(node.operand, flag),
                        op(OpCode.PostFixPlusPLus)
                    ]
                case ts.SyntaxKind.MinusMinusToken:
                    return [
                        ...generateLeft(node.operand, flag),
                        op(OpCode.PostFixMinusMinus)
                    ]
                default:
                    const nothing = node.operator
            }
        }

        if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
            return [
                ...generateLeft(node, flag),
                op(OpCode.Get)
            ]
        }

        if (ts.isParenthesizedExpression(node)) {
            return generate(node.expression, flag)
        }

        if (ts.isDebuggerStatement(node)) {
            return [op(OpCode.Debugger)]
        }

        if (ts.isThrowStatement(node)) {
            const ops: Segment = []

            ops.push(...generate(node.expression, flag))

            if (flag & StatementFlag.TryCatchFlags) {
                ops.push(op(OpCode.ThrowInTryCatchFinally))
            } else {
                ops.push(op(OpCode.Throw))
            }

            return ops
        }

        if (ts.isTryStatement(node)) {
            /** TRY START */
            const tryStatements = generate(node.tryBlock, (flag ^ (flag & StatementFlag.TryCatchFlags)) | StatementFlag.Try)
            const exitTry = [
                op(OpCode.ExitTryCatchFinally)
            ]
            /** CATCH START */

            /** CATCH START */
            const catchStatement = node.catchClause
                ? generate(node.catchClause.block, (flag ^ (flag & StatementFlag.TryCatchFlags)) | StatementFlag.Catch)
                : [op(OpCode.Nop, 0)]
            const exitCatch = [
                op(OpCode.ExitTryCatchFinally)
            ]
            /** CATCH END */

            /** Finally START */
            const finallyStatement = node.finallyBlock
                ? generate(node.finallyBlock, (flag ^ (flag & StatementFlag.TryCatchFlags)) | StatementFlag.Finally)
                : [op(OpCode.Nop, 0)]
            const exitFinally = [
                op(OpCode.ExitTryCatchFinally)
            ]
            /** Finally END */

            const exitAll = [op(OpCode.Nop, 0)]

            const catchIdentifier =node.catchClause?.variableDeclaration?.name

            if (catchIdentifier === undefined || catchIdentifier.kind !== ts.SyntaxKind.Identifier) {
                throw new Error('not support non identifier binding')
            }

            const init = [
                op(OpCode.NodeOffset, 2, [headOf(exitAll)]),
                node.catchClause
                    ? op(OpCode.NodeOffset, 2, [headOf(catchStatement)])
                    : op(OpCode.Literal, 2, [-1]),
                node.finallyBlock
                    ? op(OpCode.NodeOffset, 2, [headOf(finallyStatement)])
                    : op(OpCode.Literal, 2, [-1]),
                node.catchClause?.variableDeclaration 
                    ? op(OpCode.Literal, 2, [catchIdentifier.text]) 
                    : op(OpCode.UndefinedLiteral),
                op(OpCode.InitTryCatch)
            ]

            return [
                ...init,
                ...tryStatements,
                ...exitTry,
                ...node.catchClause
                    ? [
                        ...catchStatement,
                        ...exitCatch
                    ]
                    : [],
                ...node.finallyBlock
                    ? [
                        ...finallyStatement,
                        ...exitFinally
                    ]
                    : [],
                ...exitAll
            ]
        }

        if (ts.isSwitchStatement(node)) {
            var nextOp = op(OpCode.Nop, 0)
            nextOps.set(node, nextOp)

            const switchHead = [
                op(OpCode.Literal, 2, [SpecialVariable.SwitchValue]),
                op(OpCode.Literal, 2, [VariableType.Var]),
                op(OpCode.Literal, 2, [1]),
                op(OpCode.EnterScope),
                op(OpCode.GetRecord),
                op(OpCode.Literal, 2, [SpecialVariable.SwitchValue]),
                ...generate(node.expression, flag),
                op(OpCode.Set),
                op(OpCode.Pop)
            ]

            const bodies: {
                entry: Op,
                rule?: Op[],
                body: Op[]
            }[] = []

            for (let c of node.caseBlock.clauses) {
                if (ts.isCaseClause(c)) {
                    const rule = [
                        op(OpCode.GetRecord),
                        op(OpCode.Literal, 2, [SpecialVariable.SwitchValue]),
                        op(OpCode.Get),
                        ...generate(c.expression, flag),
                        op(OpCode.BEqualsEqualsEquals)
                    ]
                    const body = [
                        op(OpCode.Nop, 0),
                        ...c.statements.map(it => generate(it, flag)).flat()
                    ]
                    bodies.push({
                        entry: op(OpCode.Nop, 0),
                        rule,
                        body
                    })
                } else {
                    const body = c.statements.map(it => generate(it, flag)).flat()
                    bodies.push({
                        entry: op(OpCode.Nop, 0),
                        body
                    })
                }
            }

            const hasVariables = scopes.get(node.caseBlock)!.size > 0

            const connectedBodyHead = hasVariables ? generateEnterScope(node.caseBlock, scopes) : []
            const connectedBodyRules: Op[] = []
            const connectedBody: Op[] = []
            const connectedBodyExit = op(OpCode.Nop, 0)
            const connectedBodyEnd = hasVariables ? op(OpCode.LeaveScope) : op(OpCode.Nop, 0)

            for (const [index, item] of bodies.entries()) {
                connectedBody.push(...item.body)
            }

            for (const [index, item] of bodies.entries()) {
                const nextSegment = bodies[index].body[0]
                connectedBodyRules.push(op(OpCode.NodeOffset, 2, [nextSegment]))

                if (item.rule != null) {
                    connectedBodyRules.push(...item.rule)
                    connectedBodyRules.push(op(OpCode.JumpIf))
                } else {
                    connectedBodyRules.push(op(OpCode.Jump))
                }

                connectedBody.push(...item.body)
            }
            connectedBodyRules.push(op(OpCode.NodeOffset, 2, [connectedBodyExit]))
            connectedBodyRules.push(op(OpCode.Jump))

            const switchTail = [
                op(OpCode.LeaveScope)
            ]

            return [
                ...switchHead,
                ...connectedBodyHead,
                ...connectedBodyRules,
                ...connectedBody,
                connectedBodyExit,
                connectedBodyEnd,
                ...switchTail,
                nextOp
            ]
        }

        if (ts.isBreakStatement(node) && node.label == null) {
            let scopeCount = 0
            const target = findAncient(node, parentMap, (node) => {
                if ((scopes.get(node)?.size ?? 0) > 0) {
                    scopeCount++
                }

                if (nextOps.has(node)) {
                    return true
                }
                if (functions.has(node as any)) {
                    throw new Error('bug check')
                }

                if (ts.isTryStatement(node)) abort('Not support break in try catch yet')

                return false
            })
            if (target == null) {
                throw new Error('cannot find break target')
            }
            const nextNode = nextOps.get(target)
            if (nextNode == null) {
                throw new Error('did not get nextNode')
            }
            return [
                ...new Array(scopeCount).fill(0).map(it => op(OpCode.LeaveScope)),
                op(OpCode.NodeOffset, 2, [nextNode]),
                op(OpCode.Jump)
            ]
        }

        if (ts.isContinueStatement(node) && node.label == null) {
            let scopeCount = 0
            const target = findAncient(node, parentMap, (node) => {
                if ((scopes.get(node)?.size ?? 0) > 0) {
                    scopeCount++
                }

                if (continueOps.has(node)) {
                    return true
                }

                if (ts.isTryStatement(node)) abort('Not support continue in try catch yet')

                return false
            })

            if (target == null) {
                throw new Error('cannot find continue target')
            }

            const nextNode = continueOps.get(target)

            if (nextNode == null) {
                throw new Error('did not get nextNode')
            }

            const forHasScope = (scopes.get(target)?.size ?? 0) !== 0

            return [
                ...new Array(forHasScope ? scopeCount - 1 : scopeCount).fill(0).map(it => op(OpCode.LeaveScope)),
                op(OpCode.NodeOffset, 2, [nextNode]),
                op(OpCode.Jump)
            ]
        }
        if (ts.isWhileStatement(node)) {
            const nextOp = op(OpCode.Nop, 0)
            nextOps.set(node, nextOp)

            const continueOp = op(OpCode.Nop, 0)
            continueOps.set(node, continueOp)

            const exit = [
                op(OpCode.Nop, 0)
            ]
            const head = [
                op(OpCode.NodeOffset, 2, [exit]),
                ...generate(node.expression, flag),
                op(OpCode.JumpIfNot)
            ]
            const body = generate(node.statement, flag)

            return [
                continueOp,
                ...head,
                ...body,
                ...exit,
                nextOp
            ]
        }

        if (ts.isDoStatement(node)) {
            const nextOp = op(OpCode.Nop, 0)
            nextOps.set(node, nextOp)

            const continueOp = op(OpCode.Nop, 0)
            continueOps.set(node, continueOp)

            const body = generate(node.statement, flag)
            const tail = [
                op(OpCode.NodeOffset, 2, [body[0]]),
                ...generate(node.expression, flag),
                op(OpCode.JumpIf)
            ]
            return [
                continueOp,
                ...body,
                ...tail,
                nextOp
            ]
        }

        if (ts.isForInStatement(node)) {
            const nextOp = op(OpCode.Nop, 0)
            nextOps.set(node, nextOp)

            const continueOp = op(OpCode.Nop, 0)
            continueOps.set(node, continueOp)

            const hasVariable = ts.isVariableDeclarationList(node.initializer) && (node.initializer.flags & ts.NodeFlags.BlockScoped)
            const variableIsConst =
                ts.isVariableDeclarationList(node.initializer)
                    ? (node.initializer.flags & ts.NodeFlags.Const)
                    : 0
            const variableName =
                ts.isVariableDeclarationList(node.initializer)
                    ? ts.isIdentifier(node.initializer.declarations[0].name)
                        ? node.initializer.declarations[0].name.text
                        : abort('Not a identifier')
                    : ''

            const enter = generateEnterScope(node, scopes)
            const leave = generateLeaveScope(node)

            const getLhs = () => {
                if (ts.isVariableDeclarationList(node.initializer)) {
                    return generateLeft(node.initializer.declarations[0].name, flag)
                } else {
                    return generateLeft(node.initializer, flag)
                }
            }

            const head = [
                op(OpCode.GetRecord),
                op(OpCode.Literal, 2, [SpecialVariable.LoopIterator]),
                ...[
                    ...generate(node.expression, flag),
                    op(OpCode.GetPropertyIterator),
                ],
                op(OpCode.Set),
                op(OpCode.Pop)
            ]

            const condition = [
                op(OpCode.NodeOffset, 2, [leave[0]]),
                ...[
                    ...[
                        op(OpCode.GetRecord),
                        op(OpCode.Literal, 2, [SpecialVariable.IteratorEntry]),
                        ...[
                            op(OpCode.GetRecord),
                            op(OpCode.Literal, 2, [SpecialVariable.LoopIterator]),
                            op(OpCode.Get),
                            op(OpCode.NextEntry)
                        ],
                        op(OpCode.Set),
                    ],
                    op(OpCode.EntryIsDone),
                ],
                op(OpCode.JumpIf),

                ...getLhs(),

                ...(hasVariable
                    ?[
                        op(OpCode.DeTDZ)
                    ]
                    :[]
                ),

                ...[
                    op(OpCode.GetRecord),
                    op(OpCode.Literal, 2, [SpecialVariable.IteratorEntry]),
                    op(OpCode.Get),
                    op(OpCode.EntryGetValue),
                ],

                op(OpCode.Set),
                op(OpCode.Pop),

                ...(variableIsConst
                    ?[
                        ...getLhs(),
                        op(OpCode.FreezeVariable),
                        op(OpCode.Pop),
                        op(OpCode.Pop)
                    ]
                    :[]
                ),
            ]

            const body = generate(node.statement, flag)

            const continueOrLeave = hasVariable ? [
                op(OpCode.Literal, 2, [SpecialVariable.LoopIterator]),
                op(OpCode.GetRecord),
                op(OpCode.Literal, 2, [SpecialVariable.LoopIterator]),
                op(OpCode.Get),

                op(OpCode.Literal, 2, [SetFlag.DeTDZ]),

                op(OpCode.Literal, 2, [variableName]),
                op(OpCode.GetRecord),
                op(OpCode.Literal, 2, [variableName]),
                op(OpCode.Get),

                op(OpCode.Literal, 2, [SetFlag.DeTDZ]),
                
                // there is alway two variable (the iterator and initializer) in for in without destructing statement
                op(OpCode.Literal, 2, [2]),
                op(OpCode.LeaveScope),
                ...generateEnterScope(node, scopes),
                op(OpCode.GetRecord),
                op(OpCode.SetMultiple),

                op(OpCode.NodeOffset, 2, [headOf(condition)]),
                op(OpCode.Jump)
            ]
            :[
                op(OpCode.Literal, 2, [SpecialVariable.LoopIterator]),
                op(OpCode.GetRecord),
                op(OpCode.Literal, 2, [SpecialVariable.LoopIterator]),
                op(OpCode.Get),

                op(OpCode.Literal, 2, [SetFlag.DeTDZ]),
                // there is alway one variable (the iterator and initializer) in for in without destructing statement
                op(OpCode.Literal, 2, [1]),
                op(OpCode.LeaveScope),
                ...generateEnterScope(node, scopes),
                op(OpCode.GetRecord),
                op(OpCode.SetMultiple),

                op(OpCode.NodeOffset, 2, [headOf(condition)]),
                op(OpCode.Jump)
            ]

            return [
                ...enter,
                ...head,
                ...condition,
                ...body,
                continueOp,
                ...continueOrLeave,
                ...leave,
                nextOp
            ]
        }

        if (ts.isDeleteExpression(node)) {
            const unwrapped = extractQuote(node.expression)
            if (ts.isPropertyAccessExpression(unwrapped) || ts.isElementAccessExpression(unwrapped)) {
                return [
                    ...generateLeft(node.expression, flag),
                    op(OpCode.Delete)
               ]
            } else {
                // This is not delete-able and we don't care
                return [
                    ...generate(node.expression, flag),
                    op(OpCode.Pop),
                    op(OpCode.Literal, 2, [true])
                ]
            }
        }

        throw new Error(`Unknown node ${getNameOfKind(node.kind)}`)
    }

    let bodyNodes: Op<OpCode>[]

    if (ts.isSourceFile(node)) {
        const statements = [...node.statements]
        bodyNodes = statements.map(s => generate(s, 0)).flat().concat(op(OpCode.UndefinedLiteral), op(OpCode.Return))
    } else if (node.body != undefined && ts.isBlock(node.body)) {
        const statements = [...node.body.statements]
        bodyNodes = statements.map(s => generate(s, 0)).flat().concat(op(OpCode.UndefinedLiteral), op(OpCode.Return))
    } else {
        bodyNodes = [
            ...generate(node.body!, 0),
            op(OpCode.Return)
        ]
    }

    const functionDeclarationNodes = functionDeclarations.map(n => [
        op(OpCode.GetRecord),
        op(OpCode.Literal, 2, [n.name?.text]),
        op(OpCode.Literal, 2, [n.name?.text]),
        op(OpCode.NodeOffset, 2, [n]),
        op(OpCode.NodeFunctionType, 2, [n]),
        op(OpCode.DefineFunction),
        op(OpCode.Set),
        op(OpCode.Pop)
    ]).flat()

    const entry: Op[] = []

    if (ts.isSourceFile(node)) {
        entry.push(op(OpCode.Literal, 2, [0]))
    } else {
        for (let item of [...node.parameters].reverse()) {
            if (!ts.isIdentifier(item.name) || item.dotDotDotToken != null) {
                throw new Error('not support yet')
            }

            entry.push(op(OpCode.Literal, 2, [item.name.text]))
        }
        entry.push(op(OpCode.Literal, 2, [node.parameters.length]))
    }

    entry.push(...generateVariableList(node, scopes))
    entry.push(op(OpCode.NodeFunctionType, 2, [node]))
    entry.push(op(OpCode.EnterFunction))


    const results = [
        ...entry,
        ...functionDeclarationNodes,
        ...bodyNodes
    ]

    if (withPos) {
        for (const op of results) {
            if (
                op.source == null
                ||op.source.end - op.source.start > node.end - node.pos
            ) {
                op.source = {
                    start: node.pos,
                    end: node.end
                }
            }
        }
    }

    return results
}

function genOffset(nodes: Segment) {
    let offset = 0
    for (let seg of nodes) {
        seg.offset = offset
        offset += seg.length
    }
}

function generateData(seg: Segment, fnRootToSegment: Map<ts.Node, Segment>, programData: number[], textData: any[]) {
    for (const op of seg) {
        if (op.length === 0) {
            // not generate anything
        } else if (op.length === 1) {
            programData.push(op.op)
        } else if (op.op === OpCode.NodeOffset) {
            const ptr: any = op.preData[0]
            programData.push(OpCode.Literal)
            if (ptr.kind !== undefined) {
                const nodePtr: ts.Node = ptr
                programData.push(headOf(fnRootToSegment.get(nodePtr)!).offset)
            } else {
                const opPtr: Op = ptr
                programData.push(opPtr.offset)
            }
        } else if (op.op === OpCode.NodeFunctionType) {
            const func: VariableRoot = op.preData[0]
            programData.push(OpCode.Literal)
            const type = {
                [ts.SyntaxKind.SourceFile]: FunctionTypes.SourceFile,
                [ts.SyntaxKind.FunctionDeclaration]: FunctionTypes.FunctionDeclaration,
                [ts.SyntaxKind.FunctionExpression]: FunctionTypes.FunctionExpression,
                [ts.SyntaxKind.ArrowFunction]: FunctionTypes.ArrowFunction,
                [ts.SyntaxKind.GetAccessor]: FunctionTypes.GetAccessor,
                [ts.SyntaxKind.SetAccessor]: FunctionTypes.SetAccessor,
                [ts.SyntaxKind.Constructor]: FunctionTypes.Constructor,
                [ts.SyntaxKind.MethodDeclaration]: FunctionTypes.MethodDeclaration,
            }
            programData.push(type[func.kind])
        } else {
            programData.push(op.op)

            switch (op.op) {
                case OpCode.Literal:
                    if (isSmallNumber(op.preData[0])) {
                        programData.push(op.preData[0])
                    } else {
                        const oldIndex = textData.indexOf(op.preData[0])
                        if (oldIndex >= 0) {
                            programData.push(TEXT_DADA_MASK | oldIndex)
                        } else {
                            programData.push(TEXT_DADA_MASK | (textData.push(op.preData[0]) - 1))
                        }
                    }
                    break;
                default:
                    throw new Error(`Unhandled ${op.op}`)
            }
        }
    }
}

export function compile(src: string, debug = false, range = false) {
    const parentMap: ParentMap = new Map()
    const scopes: Scopes = new Map()
    const functions: Functions = new Set()
    const scopeChild: ScopeChild = new Map()

    let sourceNode = ts.createSourceFile('aaa.ts', src, ts.ScriptTarget.ESNext, undefined, ts.ScriptKind.TS)

    markParent(sourceNode, parentMap)
    searchFunctionAndScope(sourceNode, parentMap, functions, scopes)
    resolveScopes(sourceNode, parentMap, functions, scopes)
    linkScopes(sourceNode, parentMap, scopes, scopeChild)

    const program: Segment[] = []

    const functionToSegment = new Map<ts.Node, Segment>()

    for (let item of functions) {
        const generated = generateSegment(item, scopes, parentMap, functions, range)
        program.push(generated)
        functionToSegment.set(item, generated)
    }

    const flattened = program.flat()

    genOffset(flattened)

    // @ts-expect-error
    if (debug && typeof OpCode !== 'undefined') {
        const map = new Map<number, [number, number]>()
        if (range) {
            const lines = src.split(/\r?\n/g)
            let current = 0
            for (let [row, line] of lines.entries()) {
                for (let col = 0; col < line.length + 1; col++) {
                    map.set(current++, [row, col])
                }
            }
            // current += 2
        }
        console.error(flattened.map(it => {
            // @ts-expect-error
            let res = `${it.offset < 10 ? '00' + it.offset : it.offset < 100 ? '0' + it.offset : it.offset} ${OpCode[it.op]} `
            res += it.preData[0]
                ? it.preData[0].kind
                    ? getNameOfKind(it.preData[0].kind)
                    : JSON.stringify(it.preData[0])
                : JSON.stringify(it.preData[0])
            if (range) {
                res += ' ' + (it.source ? `@${map.get(it.source.start)}-${map.get(it.source.end)}` : '')
            }
            return res
        }).join('\r\n'))
    }

    const textData: any[] = []
    const programData: number[] = []

    generateData(flattened, functionToSegment, programData, textData)

    return [programData, textData] as [number[], any[]]
}