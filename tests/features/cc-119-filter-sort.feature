Feature: Task Filter Tabs, Sort Controls & Persistent View Preferences
  # CC-119: As a user, I want to filter my task list by status and sort it,
  # and I want my chosen filter and sort preference to be remembered across browser sessions.

  Background:
    Given the Task Manager application is running at http://localhost:3000
    And the task list is cleared via DELETE /api/tasks

  Scenario: Filter to Active tasks
    Given the task list contains a pending task "Buy groceries" and a completed task "Pay bills"
    When the user clicks the "Active" filter tab
    Then only the pending task "Buy groceries" is displayed
    And the completed task "Pay bills" is not visible
    And the task-count updates to show the number of active tasks
    And the "Active" tab has the "active" CSS class

  Scenario: Filter to Completed tasks
    Given the task list contains a pending task "Write report" and a completed task "Send email"
    When the user clicks the "Completed" filter tab
    Then only the completed task "Send email" is displayed
    And the pending task "Write report" is not visible
    And the task-count shows the count of completed tasks
    And the "Completed" tab has the "active" CSS class

  Scenario: Sort tasks by priority
    Given the task list contains tasks: "Low task" with Low priority, "High task" with High priority, "Medium task" with Medium priority
    When the user selects "Sort by Priority" from the sort control
    Then the tasks appear in order: "High task", "Medium task", "Low task"
    And the task-count display is not changed by the sort

  Scenario: Sort tasks by due date
    Given the task list contains: "Early task" due 2025-01-15, "Late task" due 2025-12-31, "No date task" with no due date
    When the user selects "Sort by Due Date" from the sort control
    Then the tasks appear in order: "Early task", "Late task", "No date task"
    And the ordering updates immediately without a page reload

  Scenario: Filter and sort preferences persisted across refresh
    Given the user has selected the "Active" filter and "Sort by Priority"
    When the user refreshes the browser page
    Then the "data-filter=active" button has the "active" CSS class
    And the sort control shows "Sort by Priority" as selected
    And the preferences are read from localStorage keys "tm_filter" and "tm_sort"
