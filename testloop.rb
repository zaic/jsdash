require 'optparse'
require 'fileutils'
require 'json'

options = {
    :solution => './solution.js',
    :workdir => 'testoutput',
    :start_seed => 1,
    :end_seed => 100
}

OptionParser.new do |opts|
    opts.banner = "Usage: testloop.rb [options]"

    opts.on("-sSOLUTION", "--solution=SOLUTION", "Solution to run") do |filename|
        options[:solution] = filename
    end

    opts.on('-dDIR', '--directory=DIR', 'Directory to store output') do |dir|
        options[:workdir] = dir
    end

    opts.on('--start_seed=SEED', OptionParser::DecimalInteger, 'First random seed') do |seed|
        options[:start_seed] = seed
    end

    opts.on('--end_seed=SEED', OptionParser::DecimalInteger, 'Last random seed') do |seed|
        options[:end_seed] = seed
    end
end.parse!

FileUtils.remove_dir(options[:workdir]) if File.exists?(options[:workdir])
Dir.mkdir(options[:workdir])

(options[:start_seed]..options[:end_seed]).each do |seed|
    output_filename = "#{options[:workdir]}/output#{seed}.json"

    run_options = ['node ./jsdash.js']
    run_options.push '-p' # disable time limit
    run_options.push '--force' # our nodejs verstion is newer
    run_options.push '--frames=300' # acc game
    run_options.push '--ai=' + options[:solution] # run ai solution
    run_options.push '--log=' + output_filename # store game output

    puts seed
    system run_options.join(' ')

    output = JSON.parse(File.read(output_filename))
    p output
    p output['butterflies_killed']
end
