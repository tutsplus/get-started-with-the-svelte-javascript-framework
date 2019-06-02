<script>
	import HelloForm from './components/HelloForm.svelte';
	import ManualList from './components/ManualList.svelte';

	export let name;
</script>

<style>
	h1 {
		color: purple;
	}
</style>


<!-- <h1>Hello {name}!</h1> -->
<!-- <HelloForm /> -->
<ManualList />