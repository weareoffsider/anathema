
import {src} from './FilePipe'

type MatcherDefinition = string | Array<string>
interface TaskStats {
  beginTimestamp: number
  endTimestamp?: number
  filesMatched: string[]
  filesOutput: string[]
}

export default class Task {
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
