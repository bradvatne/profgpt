// Import the necessary libraries
const _ = require("lodash");
const fs = require("fs");
const Bottleneck = require("bottleneck");

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: "INSERT-API-KEY",
});
const openai = new OpenAIApi(configuration);

const limiter = new Bottleneck({
  minTime: (1000 * 60) / 2, // Limit to 2 requests per minute
  reservoir: 2, // Maximum number of requests during initial period
  reservoirRefreshAmount: 2,
  reservoirRefreshInterval: 60 * 1000, // Refresh rate: 1 minute
  retryCount: 3, // Retry failed requests up to 3 times
  retryDelay: (retryCount) => {
    return 50 * Math.pow(2, retryCount); // Exponential backoff
  },
});

async function rateLimitedCompletion(params) {
  return await limiter.schedule(() => openai.createCompletion(params));
}

// Define the main function for generating the curriculum
async function generateCurriculum(topic) {
  // Use chatGPT to generate a list of 30 important categories for the topic
  const categories = await generateCategories(topic);
  console.log(`generating curriculum for: ${topic}`);

  // Use a loop to generate a curriculum for each category
  const curriculum = [];
  for (let i = 0; i < categories.length; i++) {
    // Get the current category
    const category = categories[i];

    // Use chatGPT to generate 10 subtopics for the current category
    const subtopics = await generateSubtopics(category);

    // Use a loop to generate a lesson for each subtopic
    for (let j = 0; j < subtopics.length; j++) {
      // Get the current subtopic
      const subtopic = subtopics[j];

      // Use chatGPT to generate a lesson for the current subtopic
      const lesson = await generateLesson(subtopic);

      // Add the lesson to the curriculum
      curriculum.push({
        category: category,
        subtopic: subtopic,
        lesson: lesson,
      });

      // Store the lesson in a text document in the app folder
      const filename = `./lessons/${category}/${subtopic}.txt`;
      const text = `Lesson for subtopic "${subtopic}":\n\n${lesson}`;
      fs.writeFileSync(filename, text);
    }
  }

  // Return the final curriculum
  return curriculum;
}

// Define the function for generating 30 categories using chatGPT
async function generateCategories(topic) {
  // Set up the chatGPT parameters
  const prompt = `Split the topic: ${topic}, into 30 categories, arranged from beginner concepts to advanced. Please include a number in front of each category to select it later.`;
  const model = "text-davinci-002";
  const maxTokens = 1024;

  // Call the OpenAI API to generate the categories
  const response = await rateLimitedCompletion(
    openai.createCompletion({
      prompt: prompt,
      model: model,
      maxTokens: maxTokens,
    })
  );

  // Extract the generated categories from the response
  const categories = response.choices[0].text.trim().split("\n");

  // Return the categories
  return categories;
}

// Define the function for generating 10 subtopics using chatGPT
async function generateSubtopics(category) {
  // Extract the category number and name from the input
  console.log(`generating subtopic ${category}`);
  const [number, name] = category.split(" ");

  // Set up the chatGPT parameters
  const prompt = `Divide the topic ${name} into 10 subtopics. Please include a number in front of each subtopic to select it later.`;
  const model = "text-davinci-002";
  const maxTokens = 1024;

  // Call the OpenAI API to generate the subtopics
  const response = await rateLimitedCompletion(
    openai.createCompletion({
      prompt: prompt,
      model: model,
      maxTokens: maxTokens,
    })
  );

  // Extract the generated subtopics from the response
  const subtopics = response.choices[0].text.trim().split("\n");

  // Return the subtopics
  return subtopics;
}

// Define the function for generating a lesson for a subtopic using chatGPT
async function generateLesson(subtopic) {
  console.log(`generating lesson for ${subtopic}`);
  // Set up the chatGPT parameters
  const prompt = `Generate a lesson for the subtopic: ${subtopic}.`;
  const model = "text-davinci-002";
  const maxTokens = 1024;

  // Call the OpenAI API to generate the lesson
  const response = await rateLimitedCompletion(
    openai.createCompletion({
      prompt: prompt,
      model: model,
      maxTokens: maxTokens,
    })
  );

  // Extract the generated lesson from the response
  const lesson = response.choices[0].text.trim();

  // Return the generated lesson
  return lesson;
}

const topic = "Next.js Programming";
generateCurriculum(topic)
  .then((curriculum) => {
    console.log(curriculum);
    console.log("Curriculum generated successfully!");
  })
  .catch((err) => {
    console.error(err);
  });
