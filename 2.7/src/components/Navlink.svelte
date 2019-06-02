<a 
    href={href}
    class:active
    on:click|preventDefault={handleClick}
>{text}</a>


<style>
a {
    color: white;
}

.active {
    font-weight: bold;
}
</style>

<script>
export let href= '#';
export let text = '';
export let active = false;

import { createEventDispatcher } from 'svelte';

let dispatch = createEventDispatcher();

function handleClick() {
    dispatch('activate', {
        text
    });
}
</script>