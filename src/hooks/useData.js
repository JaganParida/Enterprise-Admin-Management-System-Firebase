import { useState, useEffect, useRef } from "react";
import axios from "axios";

export const useData = (url, config = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get(url, config);
      setData(response.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  };

  useEffect(() => {
    fetchData(!isFirstLoad.current); // Silent refresh if not first load
  }, [url]);

  return { data, loading, reload: fetchData };
};
