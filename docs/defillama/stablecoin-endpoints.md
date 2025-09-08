# DefiLlama API

Need higher rate limits or priority support? We offer a premium plan for 300$/mo. To get it, go to [https://defillama.com/subscription](https://defillama.com/subscription)

Coding with AI? Paste this link to LLM-specific docs for best results: [llms.txt](https://api-docs.defillama.com/llms.txt)

## stablecoins
Data from our stablecoins dashboard

---

### List all stablecoins along with their circulating amounts
**GET** `/stablecoins`

**Query Parameters**
- `includePrices` (boolean)
  - set whether to include current stablecoin prices
  - Example: `true`

**Request**
```javascript
import axios from 'axios';

const options = {method: 'GET', url: '[https://stablecoins.llama.fi/stablecoins](https://stablecoins.llama.fi/stablecoins)'};

try {
  const { data } = await axios.request(options);
  console.log(data);
} catch (error) {
  console.error(error);
}