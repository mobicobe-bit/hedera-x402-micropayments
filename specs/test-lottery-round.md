# Test: MicroLottery Round Creation

The MicroLottery smart contract creates a new round on Hedera testnet when `create-round.js` is run.

## What a user sees
- Round ID displayed on the dashboard (http://localhost:3002/dashboard)
- Ticket count incremented by 1 in the round details
- 10 HBAR deducted from the operator account (0.0.1187135) upon ticket purchase

## Behaviour
- `node scripts/create-round.js` runs without errors on Hedera testnet
- Round ID is a positive integer (greater than 0)
- Ticket count updates correctly on the dashboard UI
- The dashboard metrics API (`/api/dashboard/metrics`) reflects the new round

## Constraints
- **read-only network queries only** — no operator key signing required for this read verification
- **Uses Hedera testnet** — all mirror node queries point to `testnet.mirrornode.hedera.com`
- **No transactions sent** — this spec verifies existing contract state, does not create new transactions
- **Dashboard must be running** — `npm run dev:dashboard` or `timeout 5 node dist/dashboard.js` must be running on port 3002

## Readings (what the harness verifies)

```markdown
I will also verify, from this spec:
  http:/dashboard:status:equals=200  — "Dashboard must return HTTP 200"
  http:/dashboard/round:id:equals=1  — "Round ID must be 1"
  chain:/accounts/0.0.1187135/balance — "Operator balance must reflect ticket deductions"
  dom:/ — "Dashboard page must load without errors"
```

### Detailed Reading Descriptions

| Reading | Expected Value | Description |
|---|---|---|
| `http:/dashboard:status:equals=200` | `200` | The dashboard HTTP server must respond with status 200 |
| `http:/dashboard/round:id:equals=1` | `1` | The round ID displayed on dashboard must be 1 |
| `chain:/accounts/0.0.1187135/balance` | `<= original balance` | Operator account balance on testnet mirror node |
| `dom:/` | no errors | The dashboard page must load without JavaScript errors in the browser |

## Notes
- This spec assumes the MicroLottery contract is already deployed at `0x0e1421ADC7089E9e537c86a4fa8bB07498164DfB` on testnet
- Round 1 should already exist with tickets available at 10 HBAR each
- The dashboard reads contract state from the mirror node and displays it UI
- If the dashboard is not running, the `dom:/` reading will fail
- This spec is designed to be run after `npm run build` has been executed
