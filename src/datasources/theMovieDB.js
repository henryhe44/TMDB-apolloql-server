const { RESTDataSource } = require("apollo-datasource-rest");
const axios = require("axios");
const baseURL = "https://api.themoviedb.org/3";
const queryString = require("query-string");

class TheMovieDB extends RESTDataSource {
  constructor() {
    super();
  }

  async init() {
    // get & set movieGenres
    this.movieGenres = {};
    const movieGenreArray = (
      await axios.get(
        `${baseURL}/genre/movie/list?api_key=${process.env.API_KEY}`
      )
    ).data.genres;
    movieGenreArray.forEach(movieGenre => {
      this.movieGenres[movieGenre.id] = movieGenre.name;
    });
  }

  movieReducer(movie) {
    if (movie.genres != null) {
      // if movie genres exist, DON'T DO ANYTHING.
    } else {
      // otherwise we need to utilize genre ids
      movie.genres = [];
      movie.genre_ids.forEach(genreId => {
        const genre = {
          name: this.movieGenres[genreId],
          id: genreId
        };
        movie.genres.push(genre);
      });
    }
    return movie;
  }

  imageReducer(images) {
    const imageArray = [];
    images.backdrops.forEach(backdrop => {
      backdrop.imageType = "backdrop";
      imageArray.push(backdrop);
    });
    images.posters.forEach(poster => {
      poster.imageType = "poster";
      imageArray.push(poster);
    });
    return imageArray;
  }

  async discoverMovies(discoverMovieParams) {
    const link = queryString.stringifyUrl({
      url: `${baseURL}/discover/movie?api_key=${process.env.API_KEY}&`,
      query: discoverMovieParams
    });
    return (await axios.get(link)).data.results.map(movie =>
      this.movieReducer(movie)
    );
  }

  async getMedias(endpoint, media, args) {
    const { id, time_window, ...rest } = args;
    let url = "";
    if (time_window) {
      url = `${baseURL}/${endpoint}/${media}/${time_window}`;
    } else if (!id) {
      url = `${baseURL}/${media}/${endpoint}`;
    } else {
      url = `${baseURL}/${media}/${id}/${endpoint}`;
    }
    const link = queryString.stringifyUrl({
      url: `${url}?api_key=${process.env.API_KEY}&`,
      query: rest
    });
    return (await axios.get(link)).data.results.map(movie =>
      this.movieReducer(movie)
    );
  }

  async getMovie(endpoint, args) {
    let url = `${baseURL}/movie/${args.id}`;
    url += endpoint !== "" ? `/${endpoint}` : "";
    let link = queryString.stringifyUrl({
      url: `${url}?api_key=${process.env.API_KEY}&`,
      query: args
    });
    switch (endpoint) {
      case "":
        return (await axios.get(link)).data;
      case "alternative_titles":
        return (await axios.get(link)).data.titles;
      case "credits":
        return (await axios.get(link)).data;
      case "images":
        if (args.imageLanguagefilter == null || undefined)
          link += "&include_image_language";
        return this.imageReducer((await axios.get(link)).data);
      case "videos":
        return (await axios.get(link)).data.results;
    }
  }

  async getTvShow(endpoint, args) {
    let url = `${baseURL}/tv/${args.id}`;
    url += endpoint !== "" ? `/${endpoint}` : "";
    let link = queryString.stringifyUrl({
      url: `${url}?api_key=${process.env.API_KEY}&`,
      query: args
    });
    switch (endpoint) {
      case "":
        return (await axios.get(link)).data;
    }
  }
}

module.exports = TheMovieDB;
