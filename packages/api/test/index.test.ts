import Bundles from "../";

// create client
const client = new Bundles("http://localhost:8080");

// get nodeinfo
console.log(await client.GetInfo());

// create paste
console.log(await client.GetPaste("api-test"));
console.log(
    await client.NewPaste({
        Content: "test",
        CustomURL: "api-test",
        EditPassword: "12345",
    })
);

// edit paste
console.log(await client.GetPaste("api-test"));
console.log(
    await client.EditPaste({
        Content: "test 1",
        CustomURL: "api-test",
        EditPassword: "12345",
    })
);

// delete paste
console.log(await client.GetPaste("api-test"));
console.log(
    await client.DeletePaste({
        CustomURL: "api-test",
        EditPassword: "12345",
    })
);
