import {readFile, readdir, writeFile} from 'fs'
import * as path from 'path'
import {Minimatch} from 'minimatch'
import {Glob} from 'glob'
import * as mkdirp from 'mkdirp'
import chalk from 'chalk'

interface RunContext {
  source: string
}

export function reportOnTask(task: Task, status: string, err?: any) {
  const log = console.log

  if (status == "fail") {
    log(chalk.red.bold('Task: ') + chalk.white.bold.underline(task.name))
    log(chalk.red("  Task failed to complete:"))
    log(chalk.red('  ' + err.stack))
  } else {
    log(chalk.green.bold('Task: ') + chalk.white.bold.underline(task.name))
    log(chalk.green("  Task complete."))
  }

  if (task.stats.filesMatched.length > 0) {
    log(chalk.cyan('  -> input files'))
    task.stats.filesMatched.forEach((file: string) => {
      const shortPath = file.replace(task.rootDirectory, '')
      log('    - ' + shortPath)
    })
  } else {
    console.log(chalk.red.bold('  -> no input files were found'))
  }

  if (task.stats.filesOutput.length > 0) {
    console.log(chalk.cyan('  <- output files'))
    task.stats.filesOutput.forEach((file: string) => {
      const shortPath = file.replace(task.rootDirectory, '')
      console.log('    - ' + shortPath)
    })
  } else {
    console.log(chalk.red.bold('  <- no files were output'))
  }

  log('')
}

export default class Anathema {
  public taskRegister: {[key: string]: any}
  public rootDirectory: string
  public config: any

  constructor (config: any = null) {
    this.taskRegister = {}
    this.rootDirectory = null
    this.config = config
  }

  dashboard () {
  }

  watcher () {
  }

  task (name: string, func: any) {
    this.taskRegister[name] = func
  }

  run (name: string, runContext: RunContext) {
    if (this.taskRegister[name]) {
      const func = this.taskRegister[name]
      const task = new Task(name, this.rootDirectory)

      return func(task).then((success: any) => {
        task.stats.endTimestamp = +new Date()
        if (runContext.source == 'cli') {
          reportOnTask(task, "success")
        }
      }, (err: any) => {
        reportOnTask(task, "fail", err)
        throw err
      })
    } else {
      return Promise.reject(new Error(
        `Task not found: ${name}`
      ))
    }
  }

}


export {
  Anathema,
}

type MatcherDefinition = string | Array<string>

interface TaskStats {
  beginTimestamp: number
  endTimestamp?: number
  filesMatched: string[]
  filesOutput: string[]
}

export class Task {
  public name: string
  public rootDirectory: string
  public stats: TaskStats

  constructor (name: string, rootDir: string) {
    this.name = name
    this.stats = {
      beginTimestamp: +new Date(),
      filesMatched: [],
      filesOutput: [],
    }
    this.rootDirectory = rootDir
  }

  src (matcher: MatcherDefinition) {
    return src(this, this.rootDirectory, matcher)
  }
}

const taskRegister: {[key: string]: any} = {}


interface WorkingFile {
  name: string
  directory: string
  originalPath?: string | Buffer
  originalData?: string | Buffer
  data: any
}

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

async function getWorkingFiles (task: Task, root: string, matcher: string) {
  return new Promise<Array<WorkingFile>>((resolve, reject) => {
    new Glob(path.join(root, matcher), (err, files) => {
      if (err) return reject(err)

      files.forEach(file => task.stats.filesMatched.push(file))
      const wrappedFiles = files.map(loadFile)
      
      resolve(Promise.all(
        files.map(loadFile)
      ))
    })
  })
}

export function src (task: Task, rootDir: string, matcher: MatcherDefinition) {
  return new FilePipe(task, rootDir, matcher)
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

  constructor (task: Task, root: string, matcher: MatcherDefinition) {
    this.task = task
    this.root = root

    if (typeof matcher == "string") {
      this.promise = getWorkingFiles(task, root, matcher)
    } else {
      this.promise = Promise.all(matcher.map((matchString: string) => {
        return getWorkingFiles(task, root, matchString)
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

        file.name = pathStr
        resolve(file)
      })
    })
  })
}






