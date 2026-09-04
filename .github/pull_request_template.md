## Summary

Describe what changed and why.

## Verification

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `git diff --check`

## Safety review

- [ ] No secret values, customer records, or production credentials were added.
- [ ] Database migrations were reviewed in filename order and were not applied by CI.
- [ ] Private/API responses remain excluded from the service-worker cache.
- [ ] Destructive account or database behavior was tested only with disposable data.
