Feature: Add Priority, Due Date & Inline Title Editing to Tasks
  # CC-120: As a user, I want to assign a priority level and an optional due date
  # when creating or editing a task, and I want to edit the task title inline.

  Background:
    Given the Task Manager application is running at http://localhost:3000
    And the task list is cleared via DELETE /api/tasks

  Scenario: Create a task with priority and due date
    Given the user opens the Add Task form
    When the user enters title "Prepare slides", selects "High" priority, picks due date "2025-06-30", and submits the form
    Then the new task "Prepare slides" appears in the list
    And the task shows a "High" priority badge
    And the task shows the formatted due date "2025-06-30"
    And the task-count updates to reflect the new pending count

  Scenario: Create a task with default priority and no due date
    Given the user opens the Add Task form
    When the user enters only the title "Read documentation" and submits without choosing a priority or due date
    Then the task is created with priority "Medium"
    And the task renders with a "Medium" badge
    And no due-date label is displayed

  Scenario: Edit a task title inline
    Given a task "Review code" already exists in the list
    When the user double-clicks the task's title span
    Then the title becomes an editable inline input pre-populated with "Review code"
    When the user changes the text to "Review and merge code" and presses Enter
    Then the list re-renders showing "Review and merge code"

  Scenario: Overdue task visual indicator
    Given a task "Submit report" is created with due date "2020-01-01" and is not yet marked done
    When the task list is rendered
    Then the due-date label is displayed in red with an "Overdue" indicator
    And the task row receives a distinct CSS class for overdue styling

  Scenario: Data persisted across page refresh
    Given a task "Order supplies" was created with priority "Low" and due date "2027-03-15"
    When the user refreshes the browser
    Then the GET /api/tasks response includes the priority and due_date fields
    And the task renders with the "Low" priority badge and due-date label "2027-03-15"
