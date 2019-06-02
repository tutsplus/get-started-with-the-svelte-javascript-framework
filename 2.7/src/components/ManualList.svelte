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
    import { createEventDispatcher } from 'svelte';
    let dispatch = createEventDispatcher();

    let guitarInput = '';
    let guitars = [];
    let inputElement;

    function addGuitar() {
        guitars = [...guitars, guitarInput];

        dispatch('new-item', {
            value: guitarInput
        });
        
        guitarInput = '';

        inputElement.focus();
    }
</script>