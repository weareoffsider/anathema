import {screen} from 'blessed'
import Watcher, {WatchEntry} from './Watcher'
import {Anathema} from './index'

export default class Dashboard {
  public dashState: any

  constructor (
    public anathemaInstance: Anathema,
    public name: string,
    public rootDirectory: string,
    private endPromise: any,
    private crashPromise: any
  ) {
    this.dashState = {
      watchers: {},
    }
  }

  watch (watcherIds: string[]) {
    watcherIds.forEach((watcherId) => {
      const watchEntry = this.anathemaInstance.watchRegister[watcherId]
      if (!watchEntry) {
        throw new Error(`Watcher named '${watcherId}' not found`)
      }

      this.dashState.watchers[watcherId] = new Watcher(
        this.anathemaInstance,
        this,
        watcherId,
        this.rootDirectory,
        watchEntry.matcher,
        watchEntry.tasks,
        watchEntry.options
      )
    })
    console.log(watcherIds)
  }
}
