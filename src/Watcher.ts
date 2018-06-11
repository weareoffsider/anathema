import * as chokidar from 'chokidar'
import * as path from 'path'
import {Anathema} from './index'
import Dashboard from './Dashboard'
import * as debounce from 'debounce'

export interface WatchEntry {
  name: string
  matcher: string
  options: any
  tasks: string[]
}

export default class Watcher {
  private instance: chokidar.FSWatcher

  constructor (
    public anathemaInstance: Anathema,
    public dashboardInstance: Dashboard | null,
    public name: string,
    public rootDirectory: string,
    public matcher: string,
    public tasksToFire: string[],
    public watchOptions: any
  ) {
    this.instance = chokidar.watch(
      path.join(rootDirectory, matcher),
      watchOptions || {}
    )

    const listener = debounce(this.onFileChange.bind(this), 300)
    this.instance.on('change', listener)
    this.instance.on('unlink', listener)
  }

  onFileChange (path: string) {
    this.tasksToFire.forEach((taskName) => {
      this.anathemaInstance.run(taskName, {
        source: "watcher",
        watcher: this,
      })
    })
  }
}
