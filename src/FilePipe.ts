import * as path from 'path'
import {readFile, readdir, writeFile} from 'fs'
import {Glob, IOptions} from 'glob'
import Task from './Task'
import * as mkdirp from 'mkdirp'

export interface FilePipeOptions extends IOptions {
  base?: string
}

interface WorkingFile {
  name: string
  directory: string
  originalPath?: string | Buffer
  originalData?: string | Buffer
  mode?: any
  data?: any
  loaded: boolean
  active: boolean
  step: number
}

export interface StringToFileDef {
  name: string
  data: string
  directory?: string
  loaded?: boolean
  active?: boolean
  step?: number
}

type MatcherDefinition = string | Array<string>


async function stubFile (filename: string) {
  return new Promise<WorkingFile>((resolve, reject) => {
    resolve({
      name: path.basename(filename),
      directory: path.dirname(filename),
      originalPath: filename,
      originalData: null,
      data: null,
      loaded: false,
      active: false,
      step: -1,
    })
  })
}

async function loadFile (file: WorkingFile) {
  return new Promise<WorkingFile>((resolve, reject) => {
    readFile(file.originalPath, (err, data) => {
      if (err) return reject(err)

      file.originalData = data
      file.data = data.toString()
      file.loaded = true
      file.step = 0

      resolve(file)
    })
  })
}

async function getWorkingFiles (task: Task, root: string, matcher: string, options?: IOptions) {
  return new Promise<Array<WorkingFile>>((resolve, reject) => {
    new Glob(path.join(root, matcher), options || {}, (err, files) => {
      if (err) return reject(err)

      files.forEach(file => task.stats.filesMatched.push(file))
      
      resolve(Promise.all(
        files.map(stubFile)
      ))
    })
  })
}

export function src (task: Task, rootDir: string, matcher: MatcherDefinition, options?: FilePipeOptions) {
  return new FilePipe(task, rootDir, matcher, options)
}

export function srcFromString(task: Task, rootDir: string, fileDef: StringToFileDef) {
  fileDef.loaded = true
  fileDef.active = true
  fileDef.step = -1
  return new FilePipe(task, rootDir, null)
    .addFileFromString(fileDef)
}

function getCommonBaseFromWorkingFiles(files: WorkingFile[]) {
  if (files.length == 0) {
    return ""
  }
  const names = files.map((f) => f.directory).sort()
  const first = names[0], last = names[names.length - 1], max = first.length
  let ix = 0
  while (ix < max && first.charAt(ix) === last.charAt(ix)) {
    ix++
  }

  return first.substring(0, ix)
}

export interface TransformInstruction { name: "transform"; args: any[]; }
export interface ConcatenateInstruction { name: "concatenate"; filename: string; }
export interface OutputInstruction { name: "output"; pathStr: string; }

export type FilePipeInstruction = (
  TransformInstruction |
  ConcatenateInstruction | OutputInstruction
)


export class FilePipe {
  public root: string
  public files: Array<WorkingFile>
  public promise: Promise<Array<WorkingFile>>
  public activeThreshold: number
  public commonBase: string
  public task: Task
  public instructions: Array<FilePipeInstruction>

  constructor (
    task: Task, root: string, matcher?: MatcherDefinition, options?: FilePipeOptions
  ) {
    this.activeThreshold = 10
    this.instructions = []
    this.task = task
    this.root = root

    const fpOptions: FilePipeOptions = options || {}
    const globOptions = Object.assign({}, options)
    delete globOptions.base

    if (matcher == null) {
      this.promise = Promise.resolve([])
    } else if (typeof matcher == "string") {
      this.promise = getWorkingFiles(task, root, matcher, globOptions)
    } else {
      this.promise = Promise.all(matcher.map((matchString: string) => {
        return getWorkingFiles(task, root, matchString, globOptions)
      })).then((results: Array<Array<WorkingFile>>) => {
        let finalArray: Array<WorkingFile> = []
        results.forEach((result) => {
          finalArray = finalArray.concat(result)
        })
        return finalArray
      })
    }

    this.promise = this.promise.then((workingFiles) => {
      if (fpOptions.base) {
        this.commonBase = path.join(this.root, fpOptions.base)
      } else {
        this.commonBase = getCommonBaseFromWorkingFiles(workingFiles)
      }
      workingFiles.forEach((file) => {
        file.directory = file.directory.replace(this.commonBase, '')
      })
      return workingFiles
    })
  }

  setWorkerThreshold(count: number) {
    this.activeThreshold = count
    return this
  }

  addFileFromString(fileDef: StringToFileDef) {
    this.promise = this.promise.then((result) => {
      result.push({
        name: fileDef.name,
        directory: fileDef.directory || "",
        data: fileDef.data,
        loaded: true,
        active: false,
        step: 0,
      })
      return result
    })
    return this
  }

  transform (...args: any[]) {
    this.instructions.push({
      name: "transform",
      args: args,
    })
    // this.promise = this.promise.then((result) => {
    //   return Promise.all(result.map((workingFile) => {
    //     return _transform(workingFile, args)
    //   }))
    // })
    return this
  }

  concatenate (filename: string) {
    this.instructions.push({
      name: "concatenate",
      filename,
    })
    // this.promise = this.promise.then((result) => {
    //   return [{
    //     name: filename,
    //     directory: '',
    //     data: result.map((f) => f.data).join('')
    //   }]
    // })
    return this
  }

  output (pathStr: string) {
    this.instructions.push({
      name: "output",
      pathStr,
    })
    // this.promise = this.promise.then((result) => {
    //   return Promise.all(result.map((workingFile) => {
    //     const dest = path.join(this.root, pathStr, workingFile.directory, workingFile.name)
    //     this.task.stats.filesOutput.push(dest)
    //     return _writeFile(dest, workingFile)
    //   }))
    // })
    return this
  }

  then (successFunc: any, failureFunc: any) {
    return this.promise.then((result) => {
      return _advanceFilePipe(this, result)
    }).then(successFunc, failureFunc)
  }
}


function _advanceFilePipe (pipe: FilePipe, files: WorkingFile[]): Promise<any> {
  const holdPoints: number[] = pipe.instructions.reduce((holds, instruction, ix) => {
    if (instruction.name == "concatenate") {
      holds.push(ix)
      return holds
    } else {
      return holds
    }
  }, []).concat([pipe.instructions.length])
  const nextHoldPoint = holdPoints.find((num) => {
    return files.every((f) => f.step < num + 1)
  })

  let activeFiles = files.filter((f: WorkingFile) => f.active)
  const inactiveFiles = files.filter((f: WorkingFile) => !f.active && f.step < nextHoldPoint)

  if (activeFiles.length < pipe.activeThreshold && inactiveFiles.length > 0) {
    const countToPush = pipe.activeThreshold - activeFiles.length
    activeFiles = activeFiles.concat(inactiveFiles.slice(0, countToPush))
  }

  if (activeFiles.length > 0) {
    return Promise.all(
      activeFiles.map((file) => _advanceFile(pipe, nextHoldPoint, file)))
    .then((results) => {
      return _advanceFilePipe(pipe, files)
    })
  } else if (nextHoldPoint != pipe.instructions.length) {
    const instruction = pipe.instructions[nextHoldPoint] as ConcatenateInstruction
    const newFiles = _concatenate(pipe, files, instruction.filename)
    newFiles[0].step = nextHoldPoint + 1
    return _advanceFilePipe(pipe, newFiles)
  } else {
    return Promise.resolve(files)
  }
}

function _advanceFile (pipe: FilePipe, nextHoldPoint: number, file: WorkingFile): Promise<WorkingFile> {
  file.active = true
  if (!file.loaded) {
    return loadFile(file)
  } else {
    const nextInstruction = pipe.instructions[file.step]

    // if (file.step < nextHoldPoint) {
    //   console.log("EXECUTING", nextInstruction, file.originalPath)
    // } else if (!nextInstruction) {
    //   console.log("TERMINATING", file.originalPath)
    // } else {
    //   console.log("HOLDING", file.originalPath)
    // }

    if (!nextInstruction) {
      file.active = false
      delete file.originalData
      delete file.data
      file.loaded = false
      return Promise.resolve(file)
    } else if (file.step == nextHoldPoint) {
      file.active = false
      return Promise.resolve(file)
    } else if (nextInstruction.name == "transform") {
      file.step++
      return _transform(file, nextInstruction.args)
    } else if (nextInstruction.name == "output") {
      file.step++
      return _output(pipe, file, nextInstruction.pathStr)
    } else {
      return Promise.reject(new Error("Invalid Instruction " + nextInstruction.name))
    }
  }
}


function _output (pipe: FilePipe, workingFile: WorkingFile, pathStr: string) {
  const dest = path.join(pipe.root, pathStr, workingFile.directory, workingFile.name)
  pipe.task.stats.filesOutput.push(dest)
  return _writeFile(dest, workingFile)
}

function _concatenate (pipe: FilePipe, files: WorkingFile[], filename: string) {
  return [{
    name: filename,
    directory: '',
    data: files.map((f) => f.data).join(''),
    active: true,
    loaded: true,
    step: 0,
  }]
}

function _transform (file: WorkingFile, args: any[]) {
  let promise = Promise.resolve(null)

  args.forEach((arg: any, ix: number) => {
    promise = promise.then((result: any) => {
      return new Promise<any>((resolve, reject) => {
        try {
          const newResult = arg(file, result)
          if (typeof newResult == 'undefined') {
            return resolve(null)
          }
          if (newResult.then) {
            return resolve(newResult)
          } else {
            // could be synchronous result, just return it
            resolve(newResult)
          }
        } catch (e) {
          reject(e)
        }
      })
    })
  })

  return promise.then((result: any) => file)
}


function _writeFile (pathStr: string, file: WorkingFile) {
  return new Promise<WorkingFile>((resolve, reject) => {
    const dir = path.dirname(pathStr)
    mkdirp(dir, (err: any) => {
      if (err) return reject(err)

      writeFile(
        pathStr,
        file.data,
        file.mode ? {mode: file.mode} : {},
        (err) => {
          if (err) return reject(err)

          resolve(file)
        }
      )
    })
  })
}
