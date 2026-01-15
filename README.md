# Inline TODOs
A plugin that allows you to manage your TODOs anywhere in your notes and view a summary in one place.

This plugin was initially written before the plugin system and interacted with Joplin through the API. I've been using it like that for the last few years. I finally took the time to translate it for the official Plugin system. Its implementation is pretty specific to my workflow and I don't plan to update it much, as it works for me.

The basic function of this plugin is to have a single note where you can view all your inline TODOs. This single note is identified by containing the following special comment `<!-- inline-todo-plugin -->`. This comment can be inserted by pressing `Tools -> Create TODO summary note`. Be careful not to place this in an existing note as the plugin will overwrite everything.

# Installation
- Go to `Tools -> Options -> Plugins`(macOS: Joplin -> Preferences -> Plugins)
- Search for "Inline TODO" in the search box
- Click Install and restart Joplin
- Create a Todo Summary in your folder of choice (Tools -> Create TODO Summary Note)

#### Or
- Download the [plugin jpl](https://github.com/joplin/plugins/raw/master/plugins/plugin.calebjohn.todo/plugin.jpl)
- Go to `Tools -> Options -> Plugins`
- Click on the gear icon and select "Install from file"
- Select the downloaded jpl file
- Restart Joplin
- Create a Todo Summary in your folder of choice (Tools -> Create TODO Summary Note)


# Configuration

 - Tools -> Options -> Inline TODO (Windows/Linux)
 - Joplin -> Preferences (macOS))

## TODO Types
### Metalist Style
Inspired by [this post](https://discourse.joplinapp.org/t/create-a-task-report-plugin-for-a-joplin-note-taking-app/21177) on the Joplin forum. This is the preferred style because it uses the markdown checkbox format (plus some special syntax), making it trivial to check the box and hide the TODO from the summary. 

The basic form is a checkbox, followed any (or all) of: @category (this is a primary filtering field, so there can only be one), //date, +tags, and finally the TODO content. Having at least on of these special fields is required for the todo to be picked up by the plugin, without them it is just a plain checkbox.

@category does not need to be a person, it can also be viewed as a category. It will sometimes affect the rendering of the content by grouping categories. 
```
I take a lot of notes about various things. It can be helpful to
keep my TODOs together with the content they pertain to.

- [ ] @TODO Think about how to make a plugin to solve this +joplin

This way the TODO benefits from context.

- [ ] @TODO +joplin //2022-04-04 Release the TODO plugin!

I'd still like a way to view all these! See below.
```


### Link Style
This is a simple TODO style that I've been using for the last few years. It intentionally uses the markdown link syntax which gives it highlighting in the editor and the viewer.
This format can accept a [wider variety](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#date_time_string_format) of date formats.

The basic form is a link, where the name is "TODO" and the date replaces the URL section. The TODO content just follows after.

```
I take a lot of notes about various things. It can be helpful to
keep my TODOs together with the content they pertain to.

[TODO]() Think about how to make a plugin to solve this

This way the TODO benefits from context.

[TODO](2022-04-04) Release the TODO plugin!

I'd still like a way to view all these! See below.
```

### List Style
This style just uses markdown checklist items. What sets this apart from the Metalist style is the lack of support for categories and dates in this style. This style was created for users that are already happy using plain checklists for their tasks, but want an additional place to collect them. For most users, I recommend the Metalist style instead.

```
I take a lot of notes about various things. It can be helpful to
keep my TODOs together with the content they pertain to.

- [ ] Think about how to make a plugin to solve this

This way the TODO benefits from context.

- [ ] Release the TODO plugin!

I'd still like a way to view all these! See below.
```


## Summary Types
There are two supported summary styles.

### Plain
This is the basic style that I created for myself, and have been using for the last few years. 

It starts by showing all the TODOs that have dates under the DUE section (sorted by date). After that, all the other TODOs are shown in no specific order under their respective category and parent notebook.

This style is meant for personal use, the table method (below) is recommended for more complex use.

```
# DUE
- [Note a](:/e710b7af31fc47c89ca5fc4d3c0ecb3a): 2022-01-13 Have some me time

- [Note b](:/beef7ed6d91649149751cea8d14af02d): 2022-03-12 Meat delivery +burgers

# Bob
## Folder 2
- [Note c](:/ef3aac56ffa246baa6a96cc94dd8f25e): Call Teddy +repairs

# Linda
## Folder 1
- [Note b](:/beef7ed6d91649149751cea8d14af02d): I'll get to this eventually
```

### Table
This is particularly powerful when combined with hieuthi's [table sorting plugin](https://discourse.joplinapp.org/t/plugin-markdown-table-sortable/21846). (warning: if you use the "apply sorting" feature, the sort will be overwritten when a new summary is written, don't rely on it!).

```
| Task | Category | Due | Tags | Notebook | Note |
| ---- | -------- | --- | ---- | -------- | ---- |
| Have some me time | Linda | 2022-01-13 |  | Folder 3 | [Note a](:/e710b7af31fc47c89ca5fc4d3c0ecb3a)
| Call Teddy | Bob |  | repairs | Folder 2 | [Note c](:/ef3aac56ffa246baa6a96cc94dd8f25e)
| I'll get to this eventually | Linda |  |  | Folder 1 | [Note b](:/beef7ed6d91649149751cea8d14af02d)
| Meat delivery | Bob | 2022-03-12 | burgers | Folder 1 | [Note b](:/beef7ed6d91649149751cea8d14af02d)
```

## Filtering
Todos can be filtered such that the plugin will only display Todos from specific notebooks. This can be done by adding notebook names inside the special comment. Notebooks that have a space in their name must be quoted. For example, to limit a search to only "Work" and "Special Project" notebooks, replace the default special comment with.

```
<!-- inline-todo-plugin Work "Special Project" -->
```

## Custom Editor
The plugin includes an optional custom editor that replaces the markdown summary note with an interactive GUI. This gives you a more visual way to work with your TODOs, with the ability to filter, sort, and manage tasks directly from the interface.

The powerful feature of the custom editor is the **saved filters**. Instead of having a single view of all your TODOs, you can create multiple named filter views that each show a different subset of your tasks. For example, you might have:
- A "Work" filter showing only TODOs from work-related notebooks
- A "This Week" filter showing only TODOs due in the next 7 days
- A "High Priority" filter for tasks with specific tags or categories
- A "Project X" filter combining specific notebooks, categories, and tags

Each saved filter appears in the sidebar with a count of open TODOs matching that filter, making it easy to see at a glance what needs attention. You can quickly switch between filters to get different perspectives on your TODO list without creating multiple summary notes.

Filters can combine criteria including:
- Notebooks
- Notes
- Categories (@category)
- Tags (+tag)
- Due dates (relative to the current date)
- Completion status

### Enabling the Custom Editor
The custom editor is currently off by default, but will be enabled by default in a future release.

To enable it now:
1. Go to `Tools -> Options -> Inline TODO` (Windows/Linux) or `Joplin -> Preferences -> Inline TODO` (macOS)
2. Check the box for "Enable custom editor for summary notes"
3. Open or navigate to your TODO summary note

The custom editor will automatically activate when you open a summary note (any note containing the `<!-- inline-todo-plugin -->` comment). If it doesn't open automatically, press the eye icon in the top right corner of the screen, this eye is used to toggle between the typical Joplin editor, and the new custom editor. You can click on TODOs to jump to their source note, mark them complete, or apply filters to focus on specific subsets of tasks.


# Roadmap
I consider this plugin to be finished (it meets my needs). But below are some ideas that I will implement in the future if I have some time.
### Ideas
- [ ] Add in support for spaces in the category field of the metalist style. This will allow for categories like @"Caleb John"
- [ ] Add in the fuzzy date handling (e.g. mid april)
- [ ] Add a renderer component that adds html ids (so we can scroll to TODOs)
- [ ] Add support for the [Metis plugin](https://github.com/hieuthi/joplin-plugin-metis) (todo.txt)
- [ ] [xit format](https://xit.jotaen.net/)

