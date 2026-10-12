Feature: Enhanced Task Organisation with Priority, Due Dates & Filtering
  # CC-114: Enhanced Task Organisation with Priority, Due Dates & Filtering

  Background:
    Given the Task Manager app is running at http://localhost:3000
    And the task list is cleared of all existing tasks

  Scenario 1: User creates a task with High priority and a due date
    Given the user opens the Add Task form
    When the user enters title "Prepare quarterly report"
    And selects "High" from the priority dropdown
    And enters due date "2025-12-31"
    And submits the form
    Then the new task appears in the list with title "Prepare quarterly report"
    And a "High" priority badge is visible on the task
    And the formatted due date is displayed on the task

  Scenario 2: User creates a task without selecting a priority or due date
    Given the user opens the Add Task form
    When the user enters only a title "Walk the dog"
    And submits the form without changing priority or due date
    Then the task "Walk the dog" appears in the list
    And a "Medium" priority badge is visible as the default
    And no due date is displayed for that task

  Scenario 3: User filters tasks by completion status
    Given a completed task "Finished task" exists in the list
    And an active task "Pending task" exists in the list
    When the user clicks the "Active" filter tab
    Then only "Pending task" is visible
    And "Finished task" is not visible
    When the user clicks the "Completed" filter tab
    Then only "Finished task" is visible
    And "Pending task" is not visible
    When the user clicks the "All" filter tab
    Then both "Pending task" and "Finished task" are visible

  Scenario 4: User sorts tasks by priority
    Given a task with title "Low priority task" and priority "Low" exists
    And a task with title "High priority task" and priority "High" exists
    And a task with title "Medium priority task" and priority "Medium" exists
    When the user selects "Sort by Priority" from the sort dropdown
    Then "High priority task" appears before "Medium priority task" in the list
    And "Medium priority task" appears before "Low priority task" in the list

  Scenario 5: User sorts tasks by due date
    Given a task with title "Late task" and due date "2025-12-31" exists
    And a task with title "Early task" and due date "2025-11-01" exists
    And a task with title "No date task" with no due date exists
    When the user selects "Sort by Due Date" from the sort dropdown
    Then "Early task" appears before "Late task" in the list
    And "No date task" appears after "Late task" in the list