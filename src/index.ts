import {readFile, readdir, writeFile} from 'fs'
import {dirname} from 'path'
import {Minimatch} from 'minimatch'
import {Glob} from 'glob'
import {mkdirP} from 'mkdirp'

export function task (name: string, func: any) {
  console.log(`running ${name}`)
  return func().then((success: any) => {
  }, (err: any) => {
    console.log("error", err)
  })
}

interface WorkingFile {
  name: string
  original: string | Buffer
  data: any
}

async function loadFile (filename: string) {
  return new Promise<WorkingFile>((resolve, reject) => {
    readFile(filename, (err, data) => {
      if (err) return reject(err)

      resolve({
        name: filename,
        original: data,
        data: data.toString(),
      })
    })
  })
}

async function getWorkingFiles (root: string, matcher: string) {
  return new Promise<Array<WorkingFile>>((resolve, reject) => {
    new Glob(root + matcher, (err, files) => {
      if (err) return reject(err)

      const wrappedFiles = files.map(loadFile)
      
      resolve(Promise.all(
        files.map(loadFile)
      ))
    })
  })
}

export function src (matcher: string) {
  const root = __dirname + "/../usage/"
  return new FilePipe(root, matcher)
}


export class FilePipe {
  public root: string
  public startTimestamp: number
  public files: Array<WorkingFile>
  public promise: Promise<Array<WorkingFile>>
  private callList: Array<any>

  constructor (root: string, matcher: string) {
    this.root = root
    this.startTimestamp = +new Date()
    this.promise = getWorkingFiles(root, matcher)
  }

  transform (funcIn: any, funcOut: any) {
    this.promise = this.promise.then((result) => {
      return Promise.all(result.map((workingFile) => {
        return _transform(workingFile, funcIn, funcOut)
      }))
    })
    return this
  }


  outputFile (name: string) {
    this.promise = this.promise.then((result) => {
      return Promise.all(result.map((workingFile) => {
        const dest = this.root + name
        return _writeFile(dest, workingFile)
      }))
    })
    return this
  }

  then (successFunc: any, failureFunc: any) {
    return this.promise.then(
      (result) => {
        console.log("time taken", +new Date() - this.startTimestamp)
      }, (err) => {
      }
    ).then(successFunc, failureFunc)
  }
}

function _transform (file: WorkingFile, funcIn: any, funcOut: any) {
  return new Promise<WorkingFile>((resolve, reject) => {
    const result = funcIn(file)
    if (result.then) {
      resolve(result.then((result: any) => {
        funcOut(file, result)
        return file
      }))
    }
  })
}


function _writeFile (path: string, file: WorkingFile) {
  return new Promise<WorkingFile>((resolve, reject) => {
    const dir = dirname(path)
    mkdirP(dir, (err) => {
      if (err) return reject(err)

      writeFile(path, file.data, (err) => {
        if (err) return reject(err)

        file.name = path
        resolve(file)
      })
    })
  })
}






