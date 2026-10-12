Feature: Add Priority Level and Due Date to Tasks with Filter and Sort Controls
  # CC-116: Add Priority Level and Due Date to Tasks with Filter and Sort Controls

  Background:
    Given the Task Manager app is running at http://localhost:3000
    And the task list is cleared of all existing tasks

  Scenario 1: User creates a task with High priority and a due date
    Given the user opens the Add Task form
    When the user enters a title "Prepare quarterly report"
    And selects "High" from the priority dropdown
    And picks a due date "2025-12-31"
    And submits the form
    Then the new task appears in the list with a "High" priority badge and the formatted due date visible
    And the task is persisted with priority="High" and due_date in the JSON store

  Scenario 2: User creates a task without selecting a priority or due date
    Given the user opens the Add Task form
    When the user enters only a title "Walk the dog" and submits
    Then the task is created successfully with a default priority of "Medium" and no due date displayed
    And the task is saved correctly in the store

  Scenario 3: User filters tasks by completion status
    Given there are both completed and active tasks in the list
    When the user clicks the "Active" filter tab
    Then only tasks where done=0 are displayed
    When the user clicks the "Completed" filter tab
    Then only tasks where done=1 are displayed
    When the user clicks "All"
    Then all tasks are shown again

  Scenario 4: User sorts tasks by priority
    Given the task list contains tasks with different priority levels
    And a task with title "Low priority task" and priority "Low" exists
    And a task with title "High priority task" and priority "High" exists
    And a task with title "Medium priority task" and priority "Medium" exists
    When the user selects "Sort by Priority" from the sort dropdown
    Then High priority tasks appear before Medium, and Medium before Low
    And the task counter summary remains accurate

  Scenario 5: User sorts tasks by due date
    Given the task list contains tasks with and without due dates
    And a task with title "Late task" and due date "2025-12-31" exists
    And a task with title "Early task" and due date "2025-11-01" exists
    And a task with title "No date task" with no due date exists
    When the user selects "Sort by Due Date" from the sort dropdown
    Then tasks with earlier due dates appear first
    And tasks without a due date appear at the end of the sorted list