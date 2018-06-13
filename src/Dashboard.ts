import {screen, list, listtable, log, box, Widgets} from 'blessed'
import Watcher, {WatchEntry} from './Watcher'
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
      watchers: {},
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
      interactive: true,
      scrollable: true,
      style: {
        selected: {
          bg: "white",
          fg: "black",
        },
        item: {
          fg: "white",
          bg: "black",
        },
      },
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
          bg: 'blue',
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
    }

    console.log = (...args: any[]) => {
      this.logOutputBox.log(args.map((arg) => inspect(arg)).join(', '))
      this.updateAndRender()
    }
    console.warn = (...args: any[]) => {
      this.logOutputBox.log(args.map((arg) => inspect(arg)).join(', '))
      this.updateAndRender()
    }
  }

  updateSelection (event: any) {
    this.dashState.selected = event.index - 2
    this.updateAndRender()
  }

  update () {
    const watcherItems: string[] = []
    Object.keys(this.dashState.watchers).forEach((key: string, ix: number) => {
      const watcher = this.dashState.watchers[key]
      if (watcher.tasksActive.length > 0) {
        watcherItems.push(
          watcher.name + " (" + watcher.matcher + ") " + 
          "- running " + watcher.tasksActive.join(", ")
        )
      } else {
        watcherItems.push(
          watcher.name + " (" + watcher.matcher + ")"
        )
      }

      if (this.dashState.selected == ix) {
        let content = ""
        Object.keys(watcher.lastTaskHits).forEach((tk: string) =>{ 
          const task = watcher.lastTaskHits[tk]
          content += task.reportToString("success")
        })
        this.taskOutputBox.setContent(content || "No task runs")
      }
    })
    this.watcherBox.setItems(watcherItems)

  }

  render () {
    this.screen.render()
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
    this.update()
    this.render()
  }

  updateAndRender () {
    this.update()
    this.render()
  }
}
