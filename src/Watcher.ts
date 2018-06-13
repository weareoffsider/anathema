import * as chokidar from 'chokidar'
import * as path from 'path'
import {Anathema} from './index'
import Dashboard from './Dashboard'
import Task from './Task'
import * as debounce from 'debounce'

export interface WatchEntry {
  name: string
  matcher: string
  options: any
  tasks: string[]
}

export default class Watcher {
  private instance: chokidar.FSWatcher
  public tasksActive: string[]
  public lastTaskHits: {[key: string]: Task}

  constructor (
    public anathemaInstance: Anathema,
    public dashboardInstance: Dashboard | null,
    public name: string,
    public rootDirectory: string,
    public matcher: string,
    public tasksToFire: string[],
    public watchOptions: any
  ) {
    this.lastTaskHits = {}
    this.tasksActive = []
    this.instance = chokidar.watch(
      path.join(rootDirectory, matcher),
      watchOptions || {}
    )

    const listener = debounce(this.onFileChange.bind(this), 300)
    this.instance.on('change', listener)
    this.instance.on('unlink', listener)
  }

  onTaskComplete (task: Task) {
    this.lastTaskHits[task.name] = task
    this.tasksActive = this.tasksActive.filter((k) => k !== task.name)
    this.dashboardInstance.updateAndRender()
  }

  onFileChange (path: string) {
    this.tasksToFire.forEach((taskName) => {
      this.tasksActive.push(taskName)
      this.anathemaInstance.run(taskName, {
        source: "watcher",
        watcher: this,
      })
    })
    this.dashboardInstance.updateAndRender()
  }
}
