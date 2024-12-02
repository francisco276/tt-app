export const fetchHook = async (dataObject) => {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataObject),
  };
  return fetch(
    'https://hook.us1.make.celonis.com/9icnjujhc7vi4ce6ar9cbo9ryyqbib65',
    requestOptions
  );
};
