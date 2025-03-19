# M5: Testing and Code Review

## 1. Change History

| **Change Date** | **Modified Sections** | **Rationale** |
| -------------- | --------------------- | ------------- |
| _Nothing to show_ |

---

## 2. Back-end Test Specification: APIs

### 2.1. Locations of Back-end Tests and Instructions to Run Them

#### 2.1.1. Tests

| **Interface**                                   | **Describe Group Location, No Mocks**                 | **Describe Group Location, With Mocks**            | **Mocked Components**                  |
| ---------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| **POST /users/history**                        | [`tests/unmocked/usersHistory.test.js#L1`](#)        | [`tests/mocked/usersHistory.test.js#L1`](#)       | User Database                          |
| **GET /users/history**                         | [`tests/unmocked/getUsersHistory.test.js#L1`](#)     | [`tests/mocked/getUsersHistory.test.js#L1`](#)    | User Database                          |
| **DELETE /users/history**                      | [`tests/unmocked/deleteUsersHistory.test.js#L1`](#)  | [`tests/mocked/deleteUsersHistory.test.js#L1`](#) | User Database                          |
| **GET /users/uuid**                            | [`tests/unmocked/getUserUUID.test.js#L1`](#)         | [`tests/mocked/getUserUUID.test.js#L1`](#)        | User Authentication                    |
| **GET /users/ecoscore_score**                  | [`tests/unmocked/getUserEcoscore.test.js#L1`](#)     | [`tests/mocked/getUserEcoscore.test.js#L1`](#)    | User Database                          |
| **POST /users/fcm_registration_token**         | [`tests/unmocked/setFCMToken.test.js#L1`](#)         | [`tests/mocked/setFCMToken.test.js#L1`](#)        | Firebase Cloud Messaging, User DB      |
| **POST /friends/requests**                     | [`tests/unmocked/friendRequests.test.js#L1`](#)      | [`tests/mocked/friendRequests.test.js#L1`](#)     | Friends Database                       |
| **POST /friends/requests/accept**              | [`tests/unmocked/acceptFriendRequest.test.js#L1`](#) | [`tests/mocked/acceptFriendRequest.test.js#L1`](#) | Friends Database, Notifications        |
| **DELETE /friends**                            | [`tests/unmocked/removeFriend.test.js#L1`](#)        | [`tests/mocked/removeFriend.test.js#L1`](#)       | Friends Database                       |
| **DELETE /friends/requests**                   | [`tests/unmocked/rejectFriendRequest.test.js#L1`](#) | [`tests/mocked/rejectFriendRequest.test.js#L1`](#) | Friends Database                       |
| **GET /friends/requests**                      | [`tests/unmocked/getFriendRequests.test.js#L1`](#)   | [`tests/mocked/getFriendRequests.test.js#L1`](#)  | Friends Database                       |
| **GET /friends/requests/outgoing**             | [`tests/unmocked/getOutgoingRequests.test.js#L1`](#) | [`tests/mocked/getOutgoingRequests.test.js#L1`](#) | Friends Database                       |
| **GET /friends**                               | [`tests/unmocked/getCurrentFriends.test.js#L1`](#)   | [`tests/mocked/getCurrentFriends.test.js#L1`](#)  | Friends Database                       |
| **POST /friends/notifications**                | [`tests/unmocked/sendFriendNotification.test.js#L1`](#) | [`tests/mocked/sendFriendNotification.test.js#L1`](#) | Firebase Cloud Messaging, User DB  |
| **GET /friends/ecoscore_score/:user_uuid**     | [`tests/unmocked/getFriendEcoscore.test.js#L1`](#)   | [`tests/mocked/getFriendEcoscore.test.js#L1`](#)  | Friends Database, User DB              |
| **GET /friends/history/:user_uuid**            | [`tests/unmocked/getFriendHistory.test.js#L1`](#)    | [`tests/mocked/getFriendHistory.test.js#L1`](#)   | Friends Database, User History         |
| **GET /products/:product_id**                  | [`tests/unmocked/getProduct.test.js#L1`](#)          | [`tests/mocked/getProduct.test.js#L1`](#)         | Product Database, OpenFoodFacts API    |
| **POST /auth/google**                          | [`tests/unmocked/auth.test.js#L1`](#)                | [`tests/mocked/auth.test.js#L1`](#)         | Google OAuth, User Database            |

#### 2.1.2. Commit Hash Where Tests Run

`[Insert Commit SHA here]`

#### 2.1.3. Explanation on How to Run the Tests

1. **Clone the Repository**:

   - Open your terminal and run:
     ```
     git clone https://github.com/example/your-project.git
     ```

    - Navigate to the backend directory:
     ```
     cd backend
     ```

2. **Set Up MongoDB Container**:

   - Start the MongoDB container using Docker Compose:
     ```
     docker-compose up -d mongo
     ```

3. **Download and Restore OpenFoodFacts API Database**:

   - Download the OpenFoodFacts MongoDB dump:
     ```
     wget https://static.openfoodfacts.org/data/openfoodfacts-mongodbdump.gz
     ```

   - Restore the database into your MongoDB container:
     ```
     mongorestore -vvvvv --gzip --archive="./openfoodfacts-mongodbdump.gz" --nsFrom=off.products --nsTo=products_db.products --drop --host mongo_instance
     ```

4. **Install Dependencies**:

   - Navigate to the `backend` directory:
     ```
     cd backend
     ```

   - Install the dependencies:
     ```
     npm install
     ```

5. **Run the Tests**:

   - Run the tests without mocks:
     ```
     npm run test:unmocked
     ```

   - Run the tests with mocks:
     ```
     npm run test:mocked
     ```

   - Run all the tests:
     ```
     npm test
     ```

6. **View the Test Results**:

   - The test results will be displayed in the terminal.
   - You can also view the test results in the `coverage` directory.

### 2.2. GitHub Actions Configuration Location

`~/.github/workflows/backend-tests.yml`

### 2.3. Jest Coverage Report Screenshots With Mocks

_(Placeholder for Jest coverage screenshot with mocks enabled)_

### 2.4. Jest Coverage Report Screenshots Without Mocks

_(Placeholder for Jest coverage screenshot without mocks)_

---

## 3. Back-end Test Specification: Tests of Non-Functional Requirements

### 3.1. Test Locations in Git

| **Non-Functional Requirement**  | **Location in Git**                              |
| ------------------------------- | ------------------------------------------------ |
| **Performance (Response Time)** | [`tests/nonfunctional/response_time.test.js`](#) |
| **Chat Data Security**          | [`tests/nonfunctional/chat_security.test.js`](#) |

### 3.2. Test Verification and Logs

- **Performance (Response Time)**

  - **Verification:** This test suite simulates multiple concurrent API calls using Jest along with a load-testing utility to mimic real-world user behavior. The focus is on key endpoints such as user login and study group search to ensure that each call completes within the target response time of 2 seconds under normal load. The test logs capture metrics such as average response time, maximum response time, and error rates. These logs are then analyzed to identify any performance bottlenecks, ensuring the system can handle expected traffic without degradation in user experience.
  - **Log Output**
    ```
    [Placeholder for response time test logs]
    ```

- **Chat Data Security**
  - **Verification:** ...
  - **Log Output**
    ```
    [Placeholder for chat security test logs]
    ```

---

## 4. Front-end Test Specification

### 4.1. Location in Git of Front-end Test Suite:

`frontend/src/androidTest/java/com/studygroupfinder/`

### 4.2. Tests

- **Use Case: Login**

  - **Expected Behaviors:**
    | **Scenario Steps** | **Test Case Steps** |
    | ------------------ | ------------------- |
    | 1. The user opens â€œAdd Todo Itemsâ€ screen. | Open â€œAdd Todo Itemsâ€ screen. |
    | 2. The app shows an input text field and an â€œAddâ€ button. The add button is disabled. | Check that the text field is present on screen.<br>Check that the button labelled â€œAddâ€ is present on screen.<br>Check that the â€œAddâ€ button is disabled. |
    | 3a. The user inputs an ill-formatted string. | Input â€œ_^_^^OQ#$â€ in the text field. |
    | 3a1. The app displays an error message prompting the user for the expected format. | Check that a dialog is opened with the text: â€œPlease use only alphanumeric charactersâ€. |
    | 3. The user inputs a new item for the list and the add button becomes enabled. | Input â€œbuy milkâ€ in the text field.<br>Check that the button labelled â€œaddâ€ is enabled. |
    | 4. The user presses the â€œAddâ€ button. | Click the button labelled â€œaddâ€. |
    | 5. The screen refreshes and the new item is at the bottom of the todo list. | Check that a text box with the text â€œbuy milkâ€ is present on screen.<br>Input â€œbuy chocolateâ€ in the text field.<br>Click the button labelled â€œaddâ€.<br>Check that two text boxes are present on the screen with â€œbuy milkâ€ on top and â€œbuy chocolateâ€ at the bottom. |
    | 5a. The list exceeds the maximum todo-list size. | Repeat steps 3 to 5 ten times.<br>Check that a dialog is opened with the text: â€œYou have too many items, try completing one firstâ€. |

  - **Test Logs:**
    ```
    [Placeholder for Espresso test execution logs]
    ```

- **Use Case: ...**

  - **Expected Behaviors:**

    | **Scenario Steps** | **Test Case Steps** |
    | ------------------ | ------------------- |
    | ...                | ...                 |

  - **Test Logs:**
    ```
    [Placeholder for Espresso test execution logs]
    ```

- **...**

---

## 5. Automated Code Review Results

### 5.1. Commit Hash Where Codacy Ran

`[Insert Commit SHA here]`

### 5.2. Unfixed Issues per Codacy Category

_(Placeholder for screenshots of Codacyâ€™s Category Breakdown table in Overview)_

### 5.3. Unfixed Issues per Codacy Code Pattern

_(Placeholder for screenshots of Codacyâ€™s Issues page)_

### 5.4. Justifications for Unfixed Issues

- **Code Pattern: [Usage of Deprecated Modules](#)**

  1. **Issue**

     - **Location in Git:** [`src/services/chatService.js#L31`](#)
     - **Justification:** ...

  2. ...

- ...