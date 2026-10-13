# CC-120 - Add Priority, Due Date & Inline Title Editing to Tasks

Feature: Task Priority, Due Date and Inline Title Editing
  As a user
  I want to assign a priority level and an optional due date when creating or inline-edit a task
  So that I can communicate urgency and keep my task list accurate

  Background:
    Given the Task Manager application is running at http://localhost:3000
    And the task list is cleared via the DELETE API

  Scenario 1: Create a task with priority and due date
    Given the user opens the Add Task form
    When the user enters title "Prepare quarterly report", selects "High" priority, sets due date "2027-02-15", and submits the form
    Then the new task appears in the list showing a "High" badge
    And the due date "2027-02-15" is displayed on the task
    And the task-count updates to reflect the new pending count

  Scenario 2: Create a task with default priority and no due date
    Given the user opens the Add Task form
    When the user enters only the title "Read articles" and submits without choosing a priority or due date
    Then the task is created with a "Medium" badge
    And no due-date label is shown on the task

  Scenario 3: Edit a task title inline
    Given a task "Old task title" exists in the list
    When the user double-clicks the task's title span
    Then the title becomes an editable inline input pre-populated with "Old task title"
    When the user changes the text to "Updated task title" and presses Enter
    Then the list re-renders showing "Updated task title"

  Scenario 4: Overdue task visual indicator
    Given a task "Submit expenses" exists with a due date of "2024-01-01" and is not yet marked done
    When the task list is rendered
    Then the due-date label is displayed with an "Overdue" indicator
    And the task row contains an overdue CSS class

  Scenario 5: Data persisted across page refresh
    Given a task "Plan team outing" was created with priority "Low" and due date "2027-12-31"
    When the user refreshes the browser
    Then the GET /api/tasks response includes priority "Low" and due_date "2027-12-31"
    And the task renders with a "Low" badge and due date "2027-12-31"
