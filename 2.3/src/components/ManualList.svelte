<form action="">
    <div>
        <input type="text" bind:this={inputElement} bind:value={guitarInput}>
    </div>
    <div>
        <button on:click|preventDefault={addGuitar}>Add Guitar</button>
    </div>
</form>

<ul>
    {#each guitars as guitar}
        <li>{guitar}</li>
    {/each}
</ul>


<script>
    let guitarInput = '';
    let guitars = [];
    let inputElement;

    function addGuitar() {
        guitars = [...guitars, guitarInput];
        guitarInput = '';

        inputElement.focus();
    }
</script>