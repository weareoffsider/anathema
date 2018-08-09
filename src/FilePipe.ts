import * as path from 'path'
import {readFile, readdir, writeFile} from 'fs'
import {Glob, IOptions} from 'glob'
import Task from './Task'
import * as mkdirp from 'mkdirp'

interface WorkingFile {
  name: string
  directory: string
  originalPath?: string | Buffer
  originalData?: string | Buffer
  data: any
}

export interface StringToFileDef {
  name: string
  data: string
  directory?: string
}

type MatcherDefinition = string | Array<string>

async function loadFile (filename: string) {
  return new Promise<WorkingFile>((resolve, reject) => {
    readFile(filename, (err, data) => {
      if (err) return reject(err)

      resolve({
        name: path.basename(filename),
        directory: path.dirname(filename),
        originalPath: filename,
        originalData: data,
        data: data.toString(),
      })
    })
  })
}

async function getWorkingFiles (task: Task, root: string, matcher: string, options?: IOptions) {
  return new Promise<Array<WorkingFile>>((resolve, reject) => {
    new Glob(path.join(root, matcher), options || {}, (err, files) => {
      if (err) return reject(err)

      files.forEach(file => task.stats.filesMatched.push(file))
      const wrappedFiles = files.map(loadFile)
      
      resolve(Promise.all(
        files.map(loadFile)
      ))
    })
  })
}

export function src (task: Task, rootDir: string, matcher: MatcherDefinition, options?: IOptions) {
  return new FilePipe(task, rootDir, matcher, options)
}

export function srcFromString(task: Task, rootDir: string, fileDef: StringToFileDef) {
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


export class FilePipe {
  public root: string
  public files: Array<WorkingFile>
  public promise: Promise<Array<WorkingFile>>
  public commonBase: string
  public task: Task
  private callList: Array<any>

  constructor (
    task: Task, root: string, matcher?: MatcherDefinition, options?: IOptions
  ) {
    this.task = task
    this.root = root

    if (matcher == null) {
      this.promise = Promise.resolve([])
    } else if (typeof matcher == "string") {
      this.promise = getWorkingFiles(task, root, matcher, options)
    } else {
      this.promise = Promise.all(matcher.map((matchString: string) => {
        return getWorkingFiles(task, root, matchString, options)
      })).then((results: Array<Array<WorkingFile>>) => {
        let finalArray: Array<WorkingFile> = []
        results.forEach((result) => {
          finalArray = finalArray.concat(result)
        })
        return finalArray
      })
    }

    this.promise = this.promise.then((workingFiles) => {
      this.commonBase = getCommonBaseFromWorkingFiles(workingFiles)
      workingFiles.forEach((file) => {
        file.directory = file.directory.replace(this.commonBase, '')
      })
      return workingFiles
    })
  }

  addFileFromString(fileDef: StringToFileDef) {
    this.promise = this.promise.then((result) => {
      result.push({
        name: fileDef.name,
        directory: fileDef.directory || "",
        data: fileDef.data,
      })
      return result
    })
    return this
  }

  transform (...args: any[]) {
    this.promise = this.promise.then((result) => {
      return Promise.all(result.map((workingFile) => {
        return _transform(workingFile, args)
      }))
    })
    return this
  }

  concatenate (filename: string) {
    this.promise = this.promise.then((result) => {
      return [{
        name: filename,
        directory: '',
        data: result.map((f) => f.data).join('')
      }]
    })
    return this
  }

  output (pathStr: string) {
    this.promise = this.promise.then((result) => {
      return Promise.all(result.map((workingFile) => {
        const dest = path.join(this.root, pathStr, workingFile.directory, workingFile.name)
        this.task.stats.filesOutput.push(dest)
        return _writeFile(dest, workingFile)
      }))
    })
    return this
  }

  then (successFunc: any, failureFunc: any) {
    return this.promise.then(
      (result) => {
      }
    ).then(successFunc, failureFunc)
  }
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

      writeFile(pathStr, file.data, (err) => {
        if (err) return reject(err)

        resolve(file)
      })
    })
  })
}
