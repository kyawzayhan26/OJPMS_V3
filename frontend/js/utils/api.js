(function (global) {
  const OJPMS = (global.OJPMS = global.OJPMS || {});

  function fetchJSON(path) {
    return axios
      .get(path)
      .then((response) => response.data)
      .catch((error) => {
        console.error(`Failed to load ${path}`, error);
        return Promise.reject(error);
      });
  }

  OJPMS.api = {
    fetchJSON,
  };
})(window);
