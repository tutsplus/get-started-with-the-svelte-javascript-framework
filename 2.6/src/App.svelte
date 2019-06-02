<script>
	import HelloForm from './components/HelloForm.svelte';
	import ManualList from './components/ManualList.svelte';
	import List from './components/List.svelte';
	import Navbar from './components/Navbar.svelte';

	import {onMount} from 'svelte';

	export let name;

	let items = [];

	onMount(async () => {
		let response = await fetch('guitars.json');

		items = await response.json();
	});

	let user = {
		isAuth: false
	};

</script>

<style>
	h1 {
		color: purple;
	}
</style>


<!-- <h1>Hello {name}!</h1> -->
<!-- <HelloForm /> -->
<!-- <ManualList on:new-item={
	(event) => console.log(`New Item: ${event.detail.value}`)
} /> -->

<!-- <List title={'My Guitars'} items={items} /> -->

<Navbar user={user} />
