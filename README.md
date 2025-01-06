# Multi-Agent AI Meal Planner
This application uses LangChain, Anthropic's Claude, Kafka, and Flink to create a meal plan and grocery list for a family with young children.

This project demonstrates how to use an event-driven architecture to coordinate a team of agents to solve a problem. In this model, agents are designed to emit and listen for events. Events are signals that something has happened, to which agents can respond without otherwise orchestrating a direct request to act.

<p align="center">
  <img src="/images/app-screenshot.png" />
</p>

## How it works
As a user, you can configure settings for your family such as your children's likes and dislikes and how many meals per week you want to generate.

Clicking on **Request a Meal Plan** writes a record to a backend database served by MongoDB. Once a record is written to the database, an event with the record information is written
to a Kafka topic on Confluent Cloud. 

This starts the multi-agent process. There's currently four different agents working behind the scenes to create a child meal plan, an adult meal plan, a combined meal plan, and a post-processing
agent that formats the output.

The diagram below illustrates the full architecture of the event-driven multi-agent system.

<p align="center">
  <img src="/images/app-architecture.png" />
</p>

[Confluent Cloud's](https://www.confluent.io/) Data Stream Platform is used as a shared communication and orchestration channel for the agents. The user-facing part of the web
application doesn't know anything about AI.

# Project overview

The project is split into two applications. The `web-application` is a NextJS application that uses a standard three tier stack consisting of a frontend written in React, a backend in Node, and a MongoDB application database.

Kafka and Flink, running on Confluent Cloud, are used to move data around between services. The web application doesn't know anything about LLMs, Kafka, or Flink.

The `agents` application is a Python app that includes routes to the different agents and API endpoints called by Confluent to consume messages from Kafka topics. These API endpoints take care of all the AI magic to generate a meal plan and grocery list.

# What you'll need
In order to set up and run the application, you need the following:

* [Node v22.5.1](https://nodejs.org/en) or above
* [Python 3.10](https://www.python.org/downloads/) or above
* A [Confluent Cloud](https://www.confluent.io/) account
* A [Claude](https://www.anthropic.com/claude) API key
* A [LangChain](https://www.langchain.com/) API key

## Getting set up

### Get the starter code
In a terminal, clone the sample code to your project's working directory with the following command:

```shell
git clone https://github.com/thefalc/meal-planning-agent.git
```

### Setting up MongoDB

In MongoDB create a database called `meal_planner` with the following collections:

* `meal_preferences` - Stores your prefences for generating meals
* `weekly_meal_plans` - Will contain the meal plan requests and results

### Configure and run the Meal Planner AI web application

Go into your `web-application` folder and create a `.env` file with your MongoDB connection details.

```bash
MONGODB_URI='mongodb+srv://USER:PASSWORD@CLUSTER_URI/?retryWrites=true&w=majority&appName=REPLACE_ME'
```

Navigate into the `web-application` folder and run the application.

```bash
npm install
npm run dev
```

Go to `http://localhost:3000` and try creating a meal plan request. If everything looks good, then continue with the setup.

### Setting up Confluent Cloud

The meal planner uses Confluent Cloud to move and operate on data in real-time and handle the heavy lifting for communication between the agents.

### Create the MongoDB meal planner request source connector

In order to kick start the agentic workflow, data from MongoDB needs to be published to Kafka. This can be done by creating a MongoDB source connector.

In Confluent Cloud, create a new connector.

<p align="center">
  <img src="/images/confluent-cloud-overview.png" />
</p>

* Search for "mongodb" and select the **MongoDB Atlas Source**
* Enter a topic prefix as `meal-planner.input.request`
* In **Kafka credentials**, select **Service account** and use an existing or create a new one
* In **Authentication,** enter your MongoDB connection details, the database name **meal_planner** and a collection name of **weekly_meal_plans**
* Under **Configuration**, select **JSON**
* For **Sizing**, leave the defaults and click **Continue**
* Name the connector `meal-planner-requests` and click **Continue**

### Create the HTTP sink connector to create the child meal plan

Now that data is flowing from the application database into the `meal-planner.input.request.meal_planner.weekly_meal_plans` topic, you now need to setup two HTTP sink connectors to create the child and adult meal plans.

* Under **Connectors**, click **+ Add Connector**
* Search for "http" and select the **HTTP Sink** connector
* Select the **meal-planner.input.request.meal_planner.weekly_meal_plans** topic
* In **Kafka credentials**, select **Service account** and use you existing service account and click **Continue**
* Enter the URL for where the `child-preferences-agent` endpoint is running under the `agents` folder. This will be
similar to `https://YOUR-PUBLIC-DOMAIN/api/child-preferences-agent`. If running locally, you can use [ngrok](https://ngrok.com/)
to create a publicly accessible URL. Click **Continue**
* Under **Configuration**, select **JSON** and click **Continue**
* For **Sizing**, leave the defaults and click **Continue**
* Name the connector `meal-planner-child-meal-plan` and click **Continue**

Once the connector is created, under the **Settings** > **Advanced configuration** make sure the **Request Body Format** is set to **json**.

Repeat this same set of steps for the `adult-preferences-agent` endpoint.

### Create the child meal plan topic

The `child-preferences-agent` endpoint publishes the child friendly meal plan to a Kafka topic called `meal-planner.output.child-preferences`.

In your Confluent Cloud account.

* Go to your Kafka cluster and click on **Topics** in the sidebar.
* Name the topic as `meal-planner.output.child-preferences`.
* Set other configurations as needed, such as the number of partitions and replication factor, based on your requirements.
* Go to **Schema Registry**
* Click **Add Schema** and select **meal-planner.output.child-preferences** as the subject
* Choose JSON Schema as the schema type
* Paste the schema from below into the editor

```json
{
  "properties": {
    "content": {
      "connect.index": 1,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    },
    "request_id": {
      "connect.index": 0,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    }
  },
  "title": "Record",
  "type": "object"
}
```

* Save the schema

### Create the adult meal plan topic

The `adult-preferences-agent` endpoint publishes the adult friendly meal plan to a Kafka topic called `meal-planner.output.adult-preferences`.

In your Confluent Cloud account.

* Go to your Kafka cluster and click on **Topics** in the sidebar.
* Name the topic as `meal-planner.output.adult-preferences`.
* Set other configurations as needed, such as the number of partitions and replication factor, based on your requirements.
* Go to **Schema Registry**
* Click **Add Schema** and select **meal-planner.output.adult-preferences** as the subject
* Choose JSON Schema as the schema type
* Paste the schema from below into the editor

```json
{
  "properties": {
    "content": {
      "connect.index": 1,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    },
    "request_id": {
      "connect.index": 0,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    }
  },
  "title": "Record",
  "type": "object"
}
```

* Save the schema

### Flink SQL setup to join the meal plans

Flink SQL is used to combine the child and adult meal plans into a single topic called `meal-planner.output.joined-preferences`. As events are written into this topic, the `shared-preferences-agent` is triggered to combine the meals plans into a single plan for the family.

To set this up, in your Confluent Cloud account.

* In your Kafka cluster, go to the **Stream processing** tab
* Click **Create workspace**
* Create a table for storing both meal plans using the connection you created in the previous step

```sql
CREATE TABLE `default`.`dev-us-east-1-cluster`.`meal-planner.output.joined-preferences` (
    `request_id` STRING,
    `child_preference` STRING,
    `adult_preference` STRING
) WITH (
  'value.format' = 'json-registry'
);
```
* Click **Run**

Both the `meal-planner.output.child-preferences` and `meal-planner.output.adult-preferences` topics are populating as meal plans are requested. We want to combine these independent processes together so we can start the shared agent meal planning service. 

To do this, I'm populating the `meal-planner.output.joined-preferences` topic when `meal-planner.output.child-preferences` and `meal-planner.output.adult-preferences` can be joined based on the `request_id`.

To set this up, in the same workspace where you created the table, enter the following and click **Run**.

```sql
INSERT INTO `meal-planner.output.joined-preferences`
SELECT c.`request_id`, c.content as child_preference, a.content as adult_preference FROM `meal-planner.output.child-preferences` c
  JOIN `meal-planner.output.adult-preferences` a ON c.`request_id` = a.`request_id`;
```

The next step to configuring Confluent Cloud is to create another HTTP sink connector that will call the `shared-preferences-agent` API endpoint to create the shared meal plan.

#### Created the shared preference agent HTTP sink

In your Confluent Cloud account.

* Under **Connectors**, click **+ Add Connector**
* Search for "http" and select the **HTTP Sink** connector
* Select the **meal-planner.output.joined-preferences** topic
* In **Kafka credentials**, select **Service account** and use you existing service account and click **Continue**
* Enter the URL for where the `shared-preferences-agent` endpoint is running under the `agents` folder. This will be
similar to `https://YOUR-PUBLIC-DOMAIN/api/shared-preferences-agent`. If running locally, you can use [ngrok](https://ngrok.com/)
to create a publicly accessible URL. Click **Continue**
* Under **Configuration**, select **JSON_SR** and click **Continue**
* For **Sizing**, leave the defaults and click **Continue**
* Name the connector `meal-planner-shared-preferences` and click **Continue**

Once the connector is created, under the **Settings** > **Advanced configuration** make sure the **Request Body Format** is set to **json**.

### Create the shared meal plan topic

The `shared-preferences-agent` endpoint publishes the a combined meal plan to a Kafka topic called `meal-planner.output.raw-complete-meal-plan`.

In your Confluent Cloud account.

* Go to your Kafka cluster and click on **Topics** in the sidebar.
* Name the topic as `meal-planner.output.raw-complete-meal-plan`.
* Set other configurations as needed, such as the number of partitions and replication factor, based on your requirements.
* Go to **Schema Registry**
* Click **Add Schema** and select **meal-planner.output.raw-complete-meal-plan** as the subject
* Choose JSON Schema as the schema type
* Paste the schema from below into the editor

```json
{
  "properties": {
    "meal_plan": {
      "connect.index": 1,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    },
    "request_id": {
      "connect.index": 0,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    }
  },
  "title": "Record",
  "type": "object"
}
```

* Save the schema

#### Created the format output agent HTTP sink

The format output agent takes the raw combined meal plan and formats it into JSON.

In your Confluent Cloud account.

* Under **Connectors**, click **+ Add Connector**
* Search for "http" and select the **HTTP Sink** connector
* Select the **meal-planner.output.raw-complete-meal-plans** topic
* In **Kafka credentials**, select **Service account** and use you existing service account and click **Continue**
* Enter the URL for where the `format-output-agent` endpoint is running under the `agents` folder. This will be
similar to `https://YOUR-PUBLIC-DOMAIN/api/format-output-agent`. If running locally, you can use [ngrok](https://ngrok.com/)
to create a publicly accessible URL. Click **Continue**
* Under **Configuration**, select **JSON_SR** and click **Continue**
* For **Sizing**, leave the defaults and click **Continue**
* Name the connector `meal-planner-format-output` and click **Continue**

Once the connector is created, under the **Settings** > **Advanced configuration** make sure the **Request Body Format** is set to **json**.#### Created the shared preference agent HTTP sink.

### Create the formatted output topic

The `format-output-agent` endpoint publishes the a combined meal plan and grocery list as JSON to a Kafka topic called `meal-planner.output.formatted-complete-meal-plan`.

In your Confluent Cloud account.

* Go to your Kafka cluster and click on **Topics** in the sidebar.
* Name the topic as `meal-planner.output.formatted-complete-meal-plan`.
* Set other configurations as needed, such as the number of partitions and replication factor, based on your requirements.
* Go to **Schema Registry**
* Click **Add Schema** and select **meal-planner.output.raw-complete-meal-plan** as the subject
* Choose JSON Schema as the schema type
* Paste the schema from below into the editor

```json
{
  "properties": {
    "meal_plan": {
      "connect.index": 1,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    },
    "request_id": {
      "connect.index": 0,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    }
  },
  "title": "Record",
  "type": "object"
}
```

* Save the schema

#### Created the save output HTTP sink

The save meal plan endpoint takes the JSON output of the format output agent and writes it to MongoDB.

In your Confluent Cloud account.

* Under **Connectors**, click **+ Add Connector**
* Search for "http" and select the **HTTP Sink** connector
* Select the **meal-planner.output.formatted-complete-meal-plan** topic
* In **Kafka credentials**, select **Service account** and use you existing service account and click **Continue**
* Enter the URL for where the `save-meal-plan` endpoint is running under the `agents` folder. This will be
similar to `https://YOUR-PUBLIC-DOMAIN/api/save-meal-plan`. If running locally, you can use [ngrok](https://ngrok.com/)
to create a publicly accessible URL. Click **Continue**
* Under **Configuration**, select **JSON_SR** and click **Continue**
* For **Sizing**, leave the defaults and click **Continue**
* Name the connector `meal-planner-save-meal-plan` and click **Continue**

Once the connector is created, under the **Settings** > **Advanced configuration** make sure the **Request Body Format** is set to **json**.#### Created the shared preference agent HTTP sink.

### Run the application

1. In a terminal, navigate to your project directory. Run the app with the following command:

```shell
python -m venv env
source env/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
2. From your browser, navigate to http://localhost:3000 and you should see the meal planner AI app page.
3. Configure your settings.
4. Click **Request a Meal Plan**.
4. Wait for the agent flow to complete and click the entry to view the full details of the meal plan and grocery list.