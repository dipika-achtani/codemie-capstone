# CC-119 - Implement Task Filter Tabs, Sort Controls & Persistent View Preferences

Feature: Task Filtering, Sorting and Persistent View Preferences
  As a user
  I want to filter my task list by status and sort by date, due date or priority
  So that I can quickly focus on the work most relevant to me

  Background:
    Given the Task Manager application is running at http://localhost:3000
    And the task list is cleared via the DELETE API

  Scenario 1: Filter to Active tasks
    Given the task list contains a pending task "Buy groceries" and a completed task "Pay bills"
    When the user clicks the "Active" filter tab
    Then only the task "Buy groceries" is displayed
    And the task-count shows 1 task remaining
    And the "Active" tab has the active CSS class

  Scenario 2: Filter to Completed tasks
    Given the task list contains a pending task "Write report" and a completed task "Send email"
    When the user clicks the "Completed" filter tab
    Then only the task "Send email" is displayed
    And the task-count shows 1 completed task
    And the "Completed" tab has the active CSS class

  Scenario 3: Sort tasks by priority
    Given the task list contains a "Low" priority task "Clean desk", a "High" priority task "Fix critical bug", and a "Medium" priority task "Review PR"
    When the user selects "Priority" from the sort control
    Then the tasks are reordered with "Fix critical bug" first, then "Review PR", then "Clean desk"
    And the task-count display is unaffected by the sort order

  Scenario 4: Sort tasks by due date
    Given the task list contains a task "Early deadline" with due date "2027-01-10", a task "Later deadline" with due date "2027-03-20", and a task "No deadline" with no due date
    When the user selects "Due Date" from the sort control
    Then the tasks are reordered with "Early deadline" first, then "Later deadline", then "No deadline"
    And the reordering happens without a page reload

  Scenario 5: Filter and sort preferences persisted across refresh
    Given the user has selected the "Active" filter tab
    And the user has selected "Priority" from the sort control
    When the user refreshes the browser page
    Then the "Active" filter tab is still selected
    And the sort control still shows "Priority" as the selected option
    And the preferences are read from localStorage keys "tm_filter" and "tm_sort"
