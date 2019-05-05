import {BASE_URL} from "./Constants.js";

export function saveModel(serializedModel) {
  return fetch(BASE_URL+'Architecture', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: serializedModel,
  }).then(response => {
    if (response.status === 201) {
      return response.json();
    } else {
      throw new Error("Something went wrong");
    }
  })
}

export function startSession(id) {
  return fetch(BASE_URL+"Train", {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({id:id}),
  }).then(response => {
    if (response.status === 201) {
      return response.json();
    }
    throw new Error("Internal error");
  });
}

export function updateTrain(sessionID) {
  return fetch(BASE_URL+"Train?id="+sessionID).then(response => {
    if (response.status === 200) {
      return response.json();
    }
    throw new Error("Training session failed to be fetched");
  })
}

export function deleteTrain(sessionID) {
  return fetch(BASE_URL+"Train", {
    method: "DELETE",
    body: JSON.stringify({id:sessionID}),
  });
}