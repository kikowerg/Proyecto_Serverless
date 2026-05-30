const jwt = require("jsonwebtoken");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const SECRET = "mi_clave_secreta";

// DynamoDB
const client = new DynamoDBClient({
  region: "us-east-1",
});

const dynamo = DynamoDBDocumentClient.from(client);

// LOGIN
module.exports.login = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Usuario de prueba
    if (body.username !== "admin" || body.password !== "1234") {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: "Credenciales inválidas",
        }),
      };
    }

    const token = jwt.sign(
      {
        username: body.username,
      },
      SECRET,
      {
        expiresIn: "1h",
      },
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        token,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
};

// USERS
module.exports.users = async () => {
  try {
    const params = {
      TableName: "Proyecto_Toni",
    };

    const result = await dynamo.send(new ScanCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
};
