# V0 Product Foundation

## Goal

V0 defined the first SupportFlow product contract around the fictional
Northstar Store. It created stable example policies, FAQs, evaluation
questions, and expected screens before authentication or AI features existed.

## Implementation process

1. Define the Northstar Store support domain and representative customer
   questions.
2. Add fixture content for policies and FAQs.
3. Define evaluation questions used to check future retrieval and chat quality.
4. Record the expected user experience for the initial product.
5. Keep the fixtures independent from a database and external AI provider.

## How it works

The fixtures are reference data for later versions. V0 does not authenticate
users, store tenant data, call Gemini, or perform vector retrieval. Later
versions use the same product assumptions when implementing real APIs.

## Validation

- Fixture tests passed.
- The product contract was reviewed before adding persistence.

## Manual check

Read the Northstar Store fixture files and confirm that policies, FAQs, and
evaluation questions describe the same support domain. No server is required.

## Boundary

V0 is not a production knowledge base. It is the stable starting contract for
the rest of the implementation.
