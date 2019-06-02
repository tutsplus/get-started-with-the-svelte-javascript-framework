<h3>{title}</h3>

<ul>
    {#each items as item}
        <li>{item}</li>
    {/each}
</ul>

<script>
    export let title = '';
    export let items = [];
</script>
