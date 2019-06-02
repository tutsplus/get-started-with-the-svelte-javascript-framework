<h4>Tell Us About Yourself</h4>

<p>Hello, {fullname}</p>

<form>
    <div>
        <label for="first-name">First Name:</label>
        <input type="text" id="first-name" bind:value={firstname}>
    </div>
    <div>
        <label for="last-name">Last Name:</label>
        <input type="text" id="last-name" bind:value={lastname}>
    </div>
</form>

<script>
    let firstname = '';
    let lastname = '';
    
    $: fullname = `${firstname} ${lastname}`;
</script>