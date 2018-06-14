import {screen, list, listtable, log, box, Widgets} from 'blessed'
import Watcher, {WatchEntry} from './Watcher'
import RunOnceMonitor from './RunOnceMonitor'
import TaskMonitor from './TaskMonitor'
import {Anathema} from './index'
import {inspect} from 'util'

export default class Dashboard {
  public dashState: any
  private screen: Widgets.Screen
  private watcherBox: Widgets.ListElement
  private taskOutputBox: Widgets.ScrollableBoxElement
  private logOutputBox: Widgets.Log
  private oldLogFuncs: any

  constructor (
    public anathemaInstance: Anathema,
    public name: string,
    public rootDirectory: string,
    private endPromise: any,
    private crashPromise: any
  ) {
    this.dashState = {
      monitors: [],
      selected: null,
    }
  }

  init () {
    this.screen = screen({smartCSR: true})
    this.screen.title = "Anathema Task Runner"
    this.watcherBox = list({
      top: 0,
      left: 0,
      width: "50%",
      height: "50%",
      items: [],
      keys: true,
      align: 'left',
      tags: true,
      style: {
        selected: {
          underline: true,
        },
      },
      interactive: true,
      scrollable: true,
      invertSelected: false,
      border: {
        type: 'line',
      },
    })
    this.taskOutputBox = list({
      top: 0,
      right: 0,
      width: "50%",
      height: "50%",
      content: "",
      keys: true,
      align: 'left',
      label: 'Task Output',
      tags: true,
      scrollable: true,
      interactive: true,
      border: {
        type: 'line',
      },
    })
    this.logOutputBox = log({
      bottom: 0,
      left: 0,
      width: "100%",
      height: "50%",
      align: 'left',
      label: 'Console Output',
      scrollbar: {
        track: {
          bg: 'red',
          fg: 'blue',
        },
      },
      scrollable: true,
      style: {
        scrollbar: {
          bg: 'blue',
        }
      },
      border: {
        type: 'line',
      },
    })
    this.screen.append(this.watcherBox)
    this.screen.append(this.taskOutputBox)
    this.screen.append(this.logOutputBox)
    this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
      return process.exit(0);
    });
    this.screen.key(['pageup'], (ch, key) => {
      this.logOutputBox.scroll(-10)
    });
    this.screen.key(['pagedown'], (ch, key) => {
      this.logOutputBox.scroll(10)
    });
    this.watcherBox.focus()
    this.watcherBox.on('select', this.updateSelection.bind(this))
    this.screen.render()
    this.watcherBox.setLabel('Tasks')
    this.patchLogger()
  }

  patchLogger () {
    this.oldLogFuncs = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    }

    console.log = (...args: any[]) => {
      this.logOutputBox.log(args.map((arg) => inspect(arg)).join(', '))
      this.updateAndRender()
    }
    console.warn = (...args: any[]) => {
      this.logOutputBox.log(args.map((arg) => inspect(arg)).join(', '))
      this.updateAndRender()
    }
    console.error = (...args: any[]) => {
      this.logOutputBox.log(args.map((arg) => inspect(arg)).join(', '))
      this.updateAndRender()
    }
  }

  addToLog (str: string) {
    this.logOutputBox.log(str)
  }

  updateSelection (event: any) {
    this.dashState.selected = event.index - 2
    this.updateAndRender()
  }

  update () {
    const monitorItems: string[] = []
    this.dashState.monitors.forEach((monitor: any, ix: number) => {
      if (monitor instanceof TaskMonitor) {
        monitorItems.push(monitor.outputStatusLine())

        if (this.dashState.selected == ix) {
          let content = ""
          Object.keys(monitor.lastTaskHits).forEach((tk: string) =>{ 
            const task = monitor.lastTaskHits[tk]
            content += task.reportToString() + "\n\n"
          })
          this.taskOutputBox.setContent(content || "No output.")
        }
      }
    })
    this.watcherBox.setItems((monitorItems as any))
  }

  render () {
    this.screen.render()
  }

  initial (taskIds: string[]) {
    this.dashState.monitors.push(new RunOnceMonitor(
      this.anathemaInstance,
      this,
      "initial",
      this.rootDirectory,
      taskIds
    ))
  }

  post (taskIds: string[]) {
    this.dashState.monitors.push(new RunOnceMonitor(
      this.anathemaInstance,
      this,
      "post",
      this.rootDirectory,
      taskIds
    ))
  }

  watch (watcherIds: string[]) {
    watcherIds.forEach((watcherId) => {
      const watchEntry = this.anathemaInstance.watchRegister[watcherId]
      if (!watchEntry) {
        throw new Error(`Watcher named '${watcherId}' not found`)
      }

      this.dashState.monitors.push(new Watcher(
        this.anathemaInstance,
        this,
        watcherId,
        this.rootDirectory,
        watchEntry.matcher,
        watchEntry.tasks,
        watchEntry.options
      ))
    })
    this.update()
    this.render()
  }

  run() {
    const initial: RunOnceMonitor[] = this.dashState.monitors.filter((monitor: any) => {
      if (monitor instanceof RunOnceMonitor) {
        return monitor.runStage == "initial"
      }
      return false
    })

    const posts: RunOnceMonitor[] = this.dashState.monitors.filter((monitor: any) => {
      if (monitor instanceof RunOnceMonitor) {
        return monitor.runStage == "post"
      }
      return false
    })
    
    const watchers: Watcher[] = this.dashState.monitors.filter((monitor: any) => {
      if (monitor instanceof Watcher) {
        return true
      }
      return false
    })

    return Promise.all(initial.map((runOnce) => {
      const result = runOnce.run()
      return result
    })).then(() => {
      return Promise.all( watchers.map((watcher) => {
        return watcher.run()
      }))
    }).then(() => {
      return Promise.all( posts.map((runOnce) => {
        return runOnce.run()
      }))
    })
  }

  updateAndRender () {
    this.update()
    this.render()
  }
}
